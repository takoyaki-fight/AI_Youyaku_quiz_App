import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/middleware/auth";
import { getConversation } from "@/lib/firestore/repository";
import { db } from "@/lib/firebase/admin";
import type { Material } from "@/types/material";

// GET /api/v1/conversations/:id/terms — 会話内の全用語を取得
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const { id: conversationId } = await params;
  const conversation = await getConversation(authResult.userId, conversationId);

  if (!conversation) {
    return NextResponse.json(
      { error: { code: "CONVERSATION_NOT_FOUND", message: "会話が見つかりません。" } },
      { status: 404 }
    );
  }

  // 全アクティブ素材を取得
  const snap = await db
    .collection(
      `users/${authResult.userId}/conversations/${conversationId}/materials`
    )
    .where("isActive", "==", true)
    .get();

  const terms: Array<{
    termId: string;
    surface: string;
    reading: string;
    definition: string;
    category: string;
    messageId: string;
  }> = [];

  for (const doc of snap.docs) {
    const material = doc.data() as Material;
    for (const term of material.terms) {
      terms.push({
        termId: term.termId,
        surface: term.surface,
        reading: term.reading,
        definition: term.definition,
        category: term.category,
        messageId: material.messageId,
      });
    }
  }

  return NextResponse.json({ terms });
}
