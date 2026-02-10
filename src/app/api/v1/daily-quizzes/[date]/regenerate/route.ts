import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/middleware/auth";
import {
  checkIdempotencyKey,
  isIdempotencyHit,
} from "@/lib/middleware/idempotency";
import { regenerateDailyQuiz } from "@/lib/services/regeneration.service";
import { saveIdempotency } from "@/lib/firestore/repository";
import { checkRateLimit, RATE_LIMITS } from "@/lib/middleware/rate-limit";

// POST /api/v1/daily-quizzes/:date/regenerate
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const idempResult = await checkIdempotencyKey(req);
  if (isIdempotencyHit(idempResult)) return idempResult;

  const { date } = await params;

  // レート制限チェック
  const rateLimitResult = await checkRateLimit(authResult.userId, RATE_LIMITS.quizRegenerate);
  if (rateLimitResult) return rateLimitResult;

  try {
    const result = await regenerateDailyQuiz(authResult.userId, date);

    await saveIdempotency(idempResult.key, result);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "REGENERATION_FAILED",
          message: error instanceof Error ? error.message : "再生成に失敗しました。",
        },
      },
      { status: 500 }
    );
  }
}
