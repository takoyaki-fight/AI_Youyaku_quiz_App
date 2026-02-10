import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/middleware/auth";
import { switchActiveMaterialVersion } from "@/lib/services/regeneration.service";

// PUT /api/v1/conversations/:convId/materials/:msgId/active-version
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ convId: string; msgId: string }> }
) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const { convId, msgId } = await params;
  const body = await req.json();
  const { version } = body;

  if (typeof version !== "number") {
    return NextResponse.json(
      { error: { code: "INVALID_VERSION", message: "version は数値で指定してください。" } },
      { status: 400 }
    );
  }

  try {
    await switchActiveMaterialVersion(authResult.userId, convId, msgId, version);
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
