import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/middleware/auth";
import {
  getUserSettings,
  updateUserSettings,
} from "@/lib/firestore/repository";

// GET /api/v1/settings
export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const settings = await getUserSettings(authResult.userId);
  return NextResponse.json({ settings });
}

// PUT /api/v1/settings
export async function PUT(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const body = await req.json();

  // バリデーション
  const updates: Record<string, unknown> = {};

  if (typeof body.dailyQuizEnabled === "boolean") {
    updates.dailyQuizEnabled = body.dailyQuizEnabled;
  }
  if (typeof body.dailyQuizMaxTotal === "number") {
    updates.dailyQuizMaxTotal = Math.max(1, Math.min(50, body.dailyQuizMaxTotal));
  }
  if (typeof body.dailyQuizMaxPerConversation === "number") {
    updates.dailyQuizMaxPerConversation = Math.max(
      1,
      Math.min(10, body.dailyQuizMaxPerConversation)
    );
  }
  if (typeof body.regenerationDailyLimit === "number") {
    updates.regenerationDailyLimit = Math.max(
      1,
      Math.min(50, body.regenerationDailyLimit)
    );
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: { code: "NO_UPDATES", message: "更新する項目がありません。" } },
      { status: 400 }
    );
  }

  const settings = await updateUserSettings(authResult.userId, updates);
  return NextResponse.json({ settings });
}
