import { NextRequest, NextResponse } from "next/server";
import { generateDailyQuizForUser } from "@/lib/services/daily-quiz.service";

// POST /api/internal/daily-quiz-generate
// Cloud Tasksから呼び出し → 1ユーザー分のQ&A生成
export async function POST(req: NextRequest) {
  // OIDC認証チェック
  const authHeader = req.headers.get("Authorization");
  if (!authHeader && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const quiz = await generateDailyQuizForUser(userId);

    return NextResponse.json({
      success: true,
      generated: !!quiz,
      quizId: quiz?.quizId || null,
    });
  } catch (error) {
    console.error("Daily quiz generation failed:", error);
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}
