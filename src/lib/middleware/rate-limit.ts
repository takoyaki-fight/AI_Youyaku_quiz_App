import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

interface RateLimitConfig {
  /** generationLog.type に対応する種別 */
  type: string;
  /** 許容回数 */
  limit: number;
  /** ウィンドウ幅（ミリ秒） */
  windowMs: number;
}

export const RATE_LIMITS = {
  /** チャット: 1分あたり10メッセージ */
  chat: { type: "chat", limit: 10, windowMs: 60 * 1000 } as RateLimitConfig,
  /** Term follow-up in popup: 20 requests per minute */
  termFollowup: {
    type: "term_followup",
    limit: 20,
    windowMs: 60 * 1000,
  } as RateLimitConfig,
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

  try {
    // 複合インデックス(type + createdAt)が未作成でも動作できるよう、
    // createdAt のみで取得してアプリ側で type を絞り込む。
    const snap = await db
      .collection(`users/${userId}/generationLogs`)
      .where("createdAt", ">=", Timestamp.fromDate(since))
      .get();

    const matchedCount = snap.docs.reduce((count, doc) => {
      const data = doc.data() as { type?: string } | undefined;
      return data?.type === config.type ? count + 1 : count;
    }, 0);

    if (matchedCount >= config.limit) {
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
  } catch (error) {
    // リミッターの問い合わせ失敗でコア機能まで止めないため fail-open とする。
    console.error("Rate limit check failed:", error);
  }

  return null;
}
