import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { verifyAuth, isAuthError } from "@/lib/middleware/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/middleware/rate-limit";
import { saveGenerationLog } from "@/lib/firestore/repository";
import { MODEL_NAME } from "@/lib/vertex-ai/client";
import {
  generateTermFollowupAnswer,
  type TermContext,
  type TermFollowupTurn,
} from "@/lib/vertex-ai/term-followup";

function normalizeString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function normalizeHistory(historyRaw: unknown): TermFollowupTurn[] {
  if (!Array.isArray(historyRaw)) return [];

  return historyRaw
    .slice(-6)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const question = normalizeString(record.question, 220);
      const answer = normalizeString(record.answer, 420);
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter((item): item is TermFollowupTurn => Boolean(item));
}

function normalizeTerm(termRaw: unknown): TermContext | null {
  if (!termRaw || typeof termRaw !== "object") return null;

  const record = termRaw as Record<string, unknown>;
  const surface = normalizeString(record.surface, 80);
  const definition = normalizeString(record.definition, 500);
  if (!surface || !definition) return null;

  const reading = normalizeString(record.reading, 80);
  const category = normalizeString(record.category, 40);
  const termId = normalizeString(record.termId, 120);

  return {
    termId: termId || undefined,
    surface,
    reading: reading || undefined,
    definition,
    category: category || undefined,
  };
}

// POST /api/v1/terms/follow-up
export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const rateLimitResult = await checkRateLimit(authResult.userId, RATE_LIMITS.termFollowup);
  if (rateLimitResult) return rateLimitResult;

  const body = await req.json().catch(() => ({}));
  const question = normalizeString((body as { question?: unknown }).question, 320);
  const term = normalizeTerm((body as { term?: unknown }).term);
  const history = normalizeHistory((body as { history?: unknown }).history);

  if (!question || !term) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message:
            "question and term(surface/definition) are required",
        },
      },
      { status: 400 }
    );
  }

  const startTime = Date.now();
  try {
    const result = await generateTermFollowupAnswer(term, question, history);
    const answer =
      result.text ||
      "\u88DC\u8DB3\u8AAC\u660E\u3092\u751F\u6210\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u8A00\u3044\u63DB\u3048\u3066\u3082\u3046\u4E00\u5EA6\u8CEA\u554F\u3057\u3066\u304F\u3060\u3055\u3044\u3002";

    await saveGenerationLog(authResult.userId, {
      logId: uuidv4(),
      type: "term_followup",
      model: MODEL_NAME,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.promptTokens + result.completionTokens,
      latencyMs: Date.now() - startTime,
      success: true,
    });

    return NextResponse.json({ answer });
  } catch (error) {
    await saveGenerationLog(authResult.userId, {
      logId: uuidv4(),
      type: "term_followup",
      model: MODEL_NAME,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      latencyMs: Date.now() - startTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        error: {
          code: "TERM_FOLLOWUP_FAILED",
          message:
            "\u88DC\u8DB3\u8AAC\u660E\u306E\u751F\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
        },
      },
      { status: 500 }
    );
  }
}
