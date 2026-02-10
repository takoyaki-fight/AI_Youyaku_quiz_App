import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

export interface AuthenticatedRequest {
  userId: string;
  email: string;
}

export async function verifyAuth(
  req: NextRequest
): Promise<AuthenticatedRequest | NextResponse> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "認証トークンがありません。" } },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return {
      userId: decoded.uid,
      email: decoded.email || "",
    };
  } catch {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "認証トークンが無効です。" } },
      { status: 401 }
    );
  }
}

export function isAuthError(
  result: AuthenticatedRequest | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
