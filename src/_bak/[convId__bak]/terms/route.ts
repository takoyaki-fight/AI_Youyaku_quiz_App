import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/middleware/auth";
import { db } from "@/lib/firebase/admin";
import type { Material, Term } from "@/types/material";

// GET /api/v1/conversations/:convId/terms — 会話内の全用語（active素材から集約）
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ convId: string }> }
) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const { convId } = await params;
  const { userId } = authResult;

  // active素材を全取得
  const snap = await db
    .collection(`users/${userId}/conversations/${convId}/materials`)
    .where("isActive", "==", true)
    .get();

  // 全素材からtermsを集約（termIdで重複排除）
  const termMap = new Map<string, Term & { messageId: string }>();

  for (const doc of snap.docs) {
    const material = doc.data() as Material;
    for (const term of material.terms) {
      if (!termMap.has(term.termId)) {
        termMap.set(term.termId, { ...term, messageId: material.messageId });
      }
    }
  }

  // surface重複の場合はconfidenceが高い方を採用
  const surfaceMap = new Map<string, Term & { messageId: string }>();
  for (const term of termMap.values()) {
    const existing = surfaceMap.get(term.surface);
    if (!existing || term.confidence > existing.confidence) {
      surfaceMap.set(term.surface, term);
    }
  }

  const terms = Array.from(surfaceMap.values()).sort((a, b) =>
    a.surface.localeCompare(b.surface, "ja")
  );

  return NextResponse.json({ terms });
}
