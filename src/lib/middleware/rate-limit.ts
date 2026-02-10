import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

interface RateLimitConfig {
  /** 制限の種類 (generationLogのtypeに対応) */
  type: string;
  /** 上限回数 */
  limit: number;
  /** ウィンドウ (ミリ秒) */
  windowMs: number;
}

export const RATE_LIMITS = {
  /** チャット: 1分あたり10メッセージ */
  chat: { type: "chat", limit: 10, windowMs: 60 * 1000 } as RateLimitConfig,
  /** 素材再生成: 1日あたり10回 */
  materialRegenerate: {
    type: "regeneration",
    limit: 10,
    windowMs: 24 * 60 * 60 * 1000,
  } as RateLimitConfig,
  /** Q&A再生成: 1日あたり3回 */
  quizRegenerate: {
    type: "regeneration",
    limit: 3,
    windowMs: 24 * 60 * 60 * 1000,
  } as RateLimitConfig,
};

export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const since = new Date(Date.now() - config.windowMs);
  const snap = await db
    .collection(`users/${userId}/generationLogs`)
    .where("type", "==", config.type)
    .where("createdAt", ">=", Timestamp.fromDate(since))
    .get();

  if (snap.size >= config.limit) {
    const windowDesc =
      config.windowMs >= 24 * 60 * 60 * 1000
        ? "1日"
        : `${Math.floor(config.windowMs / 60000)}分`;

    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: `レート制限を超えました。${windowDesc}あたり${config.limit}回までです。`,
        },
      },
      { status: 429 }
    );
  }

  return null;
}
