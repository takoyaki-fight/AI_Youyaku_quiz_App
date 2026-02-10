import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/middleware/auth";
import { switchActiveDailyQuizVersion } from "@/lib/services/regeneration.service";

// PUT /api/v1/daily-quizzes/:date/active-version
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const { date } = await params;
  const body = await req.json();
  const { version } = body;

  if (typeof version !== "number") {
    return NextResponse.json(
      { error: { code: "INVALID_VERSION", message: "version は数値で指定してください。" } },
      { status: 400 }
    );
  }

  try {
    await switchActiveDailyQuizVersion(authResult.userId, date, version);
    return NextResponse.json({ success: true, activeVersion: version });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "SWITCH_FAILED",
          message: error instanceof Error ? error.message : "切替に失敗しました。",
        },
      },
      { status: 500 }
    );
  }
}
