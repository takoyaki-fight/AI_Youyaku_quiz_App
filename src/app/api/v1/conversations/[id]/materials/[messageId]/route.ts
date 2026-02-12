import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/middleware/auth";
import { getConversation, getActiveMaterial } from "@/lib/firestore/repository";

// GET /api/v1/conversations/:id/materials/:messageId — メッセージのアクティブ素材を取得
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const { id: conversationId, messageId } = await params;
  const conversation = await getConversation(authResult.userId, conversationId);

  if (!conversation) {
    return NextResponse.json(
      { error: { code: "CONVERSATION_NOT_FOUND", message: "会話が見つかりません。" } },
      { status: 404 }
    );
  }

  const material = await getActiveMaterial(
    authResult.userId,
    conversationId,
    messageId
  );

  if (!material) {
    return NextResponse.json(
      { error: { code: "MATERIAL_NOT_FOUND", message: "素材が見つかりません。" } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    material: {
      summary: material.summary,
      terms: material.terms,
      mentions: material.mentions,
    },
  });
}
