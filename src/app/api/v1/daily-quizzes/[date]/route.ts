import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/middleware/auth";
import { getActiveDailyQuiz } from "@/lib/firestore/repository";

// GET /api/v1/daily-quizzes/:date — 特定日のQ&A（active版）
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const { date } = await params;
  const quiz = await getActiveDailyQuiz(authResult.userId, date);

  if (!quiz) {
    return NextResponse.json(
      { error: { code: "QUIZ_NOT_FOUND", message: "この日のQ&Aはありません。" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ quiz });
}
