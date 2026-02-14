import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/middleware/auth";
import {
  getConversation,
  getConversationSheet,
} from "@/lib/firestore/repository";

async function ensureConversationExists(userId: string, conversationId: string) {
  const conversation = await getConversation(userId, conversationId);
  if (!conversation) {
    return NextResponse.json(
      { error: { code: "CONVERSATION_NOT_FOUND", message: "Conversation not found" } },
      { status: 404 }
    );
  }
  return null;
}

// GET /api/v1/conversations/:id/sheets/:sheetId
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sheetId: string }> }
) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const { id: conversationId, sheetId } = await params;
  const conversationError = await ensureConversationExists(
    authResult.userId,
    conversationId
  );
  if (conversationError) return conversationError;

  const sheet = await getConversationSheet(authResult.userId, conversationId, sheetId);
  if (!sheet) {
    return NextResponse.json(
      { error: { code: "SHEET_NOT_FOUND", message: "Sheet not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ sheet });
}

// PATCH /api/v1/conversations/:id/sheets/:sheetId
export async function PATCH(
  req: NextRequest
) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;
  return NextResponse.json(
    {
      error: {
        code: "SHEET_EDIT_DISABLED",
        message: "Conversation sheets are generated automatically.",
      },
    },
    { status: 405 }
  );
}

// DELETE /api/v1/conversations/:id/sheets/:sheetId
export async function DELETE(
  req: NextRequest
) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;
  return NextResponse.json(
    {
      error: {
        code: "SHEET_DELETE_DISABLED",
        message: "Conversation sheets are managed automatically.",
      },
    },
    { status: 405 }
  );
}
