import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/middleware/auth";
import { getActiveMaterial } from "@/lib/firestore/repository";

// GET /api/v1/conversations/:convId/materials/:msgId — active版取得
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ convId: string; msgId: string }> }
) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const { convId, msgId } = await params;
  const material = await getActiveMaterial(authResult.userId, convId, msgId);

  if (!material) {
    return NextResponse.json(
      { error: { code: "MATERIAL_NOT_FOUND", message: "素材が見つかりません。" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ material });
}
