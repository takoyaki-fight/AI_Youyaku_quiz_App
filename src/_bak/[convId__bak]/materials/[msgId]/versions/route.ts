import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/middleware/auth";
import { getMaterialVersions } from "@/lib/firestore/repository";

// GET /api/v1/conversations/:convId/materials/:msgId/versions — バージョン一覧
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ convId: string; msgId: string }> }
) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const { convId, msgId } = await params;
  const versions = await getMaterialVersions(authResult.userId, convId, msgId);

  return NextResponse.json({ versions });
}
