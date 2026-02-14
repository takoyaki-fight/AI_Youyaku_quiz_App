import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/middleware/auth";
import {
  getConversation,
  getMessages,
  deleteConversationCascade,
  updateConversationTitle,
} from "@/lib/firestore/repository";

const MAX_TITLE_LENGTH = 100;

// GET /api/v1/conversations/:id - conversation detail + messages
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
      { error: { code: "CONVERSATION_NOT_FOUND", message: "Conversation not found" } },
      { status: 404 }
    );
  }

  const messages = await getMessages(authResult.userId, id);
  return NextResponse.json({ conversation, messages });
}

// PATCH /api/v1/conversations/:id - rename conversation title
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const { id } = await params;
  const conversation = await getConversation(authResult.userId, id);

  if (!conversation) {
    return NextResponse.json(
      { error: { code: "CONVERSATION_NOT_FOUND", message: "Conversation not found" } },
      { status: 404 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const rawTitle = typeof body.title === "string" ? body.title.trim() : "";

  if (!rawTitle) {
    return NextResponse.json(
      { error: { code: "INVALID_TITLE", message: "Title is required" } },
      { status: 400 }
    );
  }

  const normalizedTitle = rawTitle.slice(0, MAX_TITLE_LENGTH);
  await updateConversationTitle(authResult.userId, id, normalizedTitle);

  return NextResponse.json({
    success: true,
    conversationId: id,
    title: normalizedTitle,
  });
}

// DELETE /api/v1/conversations/:id - delete conversation (cascade)
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
      { error: { code: "CONVERSATION_NOT_FOUND", message: "Conversation not found" } },
      { status: 404 }
    );
  }

  await deleteConversationCascade(authResult.userId, id);
  return NextResponse.json({ success: true });
}
