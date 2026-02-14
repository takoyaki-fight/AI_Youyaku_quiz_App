import { NextRequest, NextResponse } from "next/server";
import { checkIdempotency } from "@/lib/firestore/repository";

interface IdempotencyOptions {
  namespace?: string;
}

function normalizeNamespace(value: string | undefined): string {
  if (!value) return "";
  return value.trim();
}

function toFirestoreSafeId(value: string): string {
  return encodeURIComponent(value);
}

function buildStorageKey(rawKey: string, options?: IdempotencyOptions): string {
  const namespace = normalizeNamespace(options?.namespace);
  const scopedKey = namespace ? `${namespace}:${rawKey}` : rawKey;
  return toFirestoreSafeId(scopedKey);
}

export async function checkIdempotencyKey(
  req: NextRequest,
  options?: IdempotencyOptions
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

  const storageKey = buildStorageKey(key, options);
  const existing = await checkIdempotency(storageKey);
  if (existing !== null) {
    // 既に処理済み → キャッシュ結果を返す
    return NextResponse.json(existing, { status: 200 });
  }

  return { key: storageKey };
}

export function isIdempotencyHit(
  result: { key: string } | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
