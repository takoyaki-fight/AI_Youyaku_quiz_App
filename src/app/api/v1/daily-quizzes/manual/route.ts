import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/middleware/auth";
import {
  checkIdempotencyKey,
  isIdempotencyHit,
} from "@/lib/middleware/idempotency";
import { checkRateLimit } from "@/lib/middleware/rate-limit";
import { saveIdempotency } from "@/lib/firestore/repository";
import { generateManualDailyQuizForUser } from "@/lib/services/daily-quiz.service";

function normalizeConversationIds(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return Array.from(
    new Set(
      input
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
    )
  );
}

function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// POST /api/v1/daily-quizzes/manual
export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const idempResult = await checkIdempotencyKey(req);
  if (isIdempotencyHit(idempResult)) return idempResult;

  const rateLimitResult = await checkRateLimit(authResult.userId, {
    type: "daily_quiz",
    limit: 3,
    windowMs: 24 * 60 * 60 * 1000,
  });
  if (rateLimitResult) return rateLimitResult;

  const body = await req.json().catch(() => ({}));
  const conversationIds = normalizeConversationIds(body.conversationIds);

  if (conversationIds.length === 0) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_CONVERSATIONS",
          message: "conversationIds must contain at least one ID",
        },
      },
      { status: 400 }
    );
  }

  if (conversationIds.length > 20) {
    return NextResponse.json(
      {
        error: {
          code: "TOO_MANY_CONVERSATIONS",
          message: "Please select 20 conversations or fewer",
        },
      },
      { status: 400 }
    );
  }

  if (
    typeof body.targetDate === "string" &&
    !isValidDateString(body.targetDate)
  ) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_TARGET_DATE",
          message: "targetDate must be in YYYY-MM-DD format",
        },
      },
      { status: 400 }
    );
  }

  const targetDate =
    typeof body.targetDate === "string" ? body.targetDate : undefined;

  try {
    const result = await generateManualDailyQuizForUser(
      authResult.userId,
      conversationIds,
      targetDate
    );

    await saveIdempotency(idempResult.key, result);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Manual quiz generation failed";
    const status =
      message.includes("No conversation IDs") ||
      message.includes("No valid conversations") ||
      message.includes("Failed to allocate") ||
      message.includes("No quiz cards")
        ? 400
        : 500;

    return NextResponse.json(
      {
        error: {
          code: "MANUAL_GENERATION_FAILED",
          message,
        },
      },
      { status }
    );
  }
}
