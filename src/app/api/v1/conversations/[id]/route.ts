import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/middleware/auth";
import {
  getConversation,
  getMessages,
  deleteConversationCascade,
} from "@/lib/firestore/repository";

// GET /api/v1/conversations/:id — 会話詳細 + メッセージ一覧
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const { id } = await params;
  const conversation = await getConversation(authResult.userId, id);

  if (!conversation) {
    return NextResponse.json(
      { error: { code: "CONVERSATION_NOT_FOUND", message: "会話が見つかりません。" } },
      { status: 404 }
    );
  }

  const messages = await getMessages(authResult.userId, id);

  return NextResponse.json({ conversation, messages });
}

// DELETE /api/v1/conversations/:id — 会話削除（カスケード）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const { id } = await params;
  const conversation = await getConversation(authResult.userId, id);

  if (!conversation) {
    return NextResponse.json(
      { error: { code: "CONVERSATION_NOT_FOUND", message: "会話が見つかりません。" } },
      { status: 404 }
    );
  }

  await deleteConversationCascade(authResult.userId, id);

  return NextResponse.json({ success: true });
}
