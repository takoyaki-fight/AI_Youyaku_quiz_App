import { NextRequest, NextResponse } from "next/server";
import { checkIdempotency } from "@/lib/firestore/repository";

export async function checkIdempotencyKey(
  req: NextRequest
): Promise<{ key: string } | NextResponse> {
  const key = req.headers.get("X-Idempotency-Key");

  if (!key) {
    return NextResponse.json(
      {
        error: {
          code: "MISSING_IDEMPOTENCY_KEY",
          message: "X-Idempotency-Key ヘッダが必要です。",
        },
      },
      { status: 400 }
    );
  }

  const existing = await checkIdempotency(key);
  if (existing !== null) {
    // 既に処理済み → キャッシュ結果を返す
    return NextResponse.json(existing, { status: 200 });
  }

  return { key };
}

export function isIdempotencyHit(
  result: { key: string } | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
