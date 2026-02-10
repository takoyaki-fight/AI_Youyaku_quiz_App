import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/middleware/auth";
import { listDailyQuizzes } from "@/lib/firestore/repository";

// GET /api/v1/daily-quizzes — 日次Q&A一覧（日付降順）
export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const quizzes = await listDailyQuizzes(authResult.userId);

  return NextResponse.json({ quizzes });
}
