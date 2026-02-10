import { db } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import {
  saveDailyQuiz,
  saveGenerationLog,
  getUserSettings,
} from "@/lib/firestore/repository";
import { generateDailyQuizCards } from "@/lib/vertex-ai/daily-quiz";
import { getYesterdayRange, getYesterdayDateString } from "@/lib/utils/date";
import type { DailyQuiz } from "@/types/daily-quiz";
import type { Message } from "@/types/message";
import type { Conversation } from "@/types/conversation";
import { v4 as uuidv4 } from "uuid";

// ─── 配分アルゴリズム ───────────────────────────────

interface QuizAllocation {
  conversationId: string;
  messageCount: number;
  allocatedQuestions: number;
}

export function allocateQuestions(
  conversations: { id: string; msgCount: number }[],
  maxTotal: number,
  maxPerConv: number
): QuizAllocation[] {
  if (conversations.length === 0) return [];

  const totalMessages = conversations.reduce((sum, c) => sum + c.msgCount, 0);

  const allocations: QuizAllocation[] = conversations.map((c) => ({
    conversationId: c.id,
    messageCount: c.msgCount,
    allocatedQuestions: Math.max(
      1,
      Math.min(
        maxPerConv,
        Math.floor((c.msgCount / totalMessages) * maxTotal)
      )
    ),
  }));

  // 合計がmaxTotalを超えたら削減
  let total = allocations.reduce((s, a) => s + a.allocatedQuestions, 0);
  while (total > maxTotal) {
    allocations.sort((a, b) => b.allocatedQuestions - a.allocatedQuestions);
    for (const a of allocations) {
      if (a.allocatedQuestions > 1 && total > maxTotal) {
        a.allocatedQuestions--;
        total--;
      }
    }
    if (total <= maxTotal) break;
    // 全て1以下なら終了
    if (allocations.every((a) => a.allocatedQuestions <= 1)) break;
  }

  // 余裕があれば追加
  while (total < maxTotal) {
    let added = false;
    for (const a of allocations) {
      if (a.allocatedQuestions < maxPerConv && total < maxTotal) {
        a.allocatedQuestions++;
        total++;
        added = true;
      }
    }
    if (!added) break;
  }

  return allocations;
}

// ─── Q&A生成メイン処理 ──────────────────────────────

export async function generateDailyQuizForUser(
  userId: string
): Promise<DailyQuiz | null> {
  const targetDate = getYesterdayDateString();
  const idempotencyKey = `${userId}_${targetDate}_v1`;

  // 冪等チェック
  const existing = await db
    .collection(`users/${userId}/dailyQuizzes`)
    .where("idempotencyKey", "==", idempotencyKey)
    .limit(1)
    .get();

  if (!existing.empty) {
    console.log(`Quiz already exists for ${userId} on ${targetDate}`);
    return null;
  }

  // ユーザー設定
  const settings = await getUserSettings(userId);
  if (!settings.dailyQuizEnabled) return null;

  // 昨日の会話を取得
  const { start, end } = getYesterdayRange();
  const convsSnap = await db
    .collection(`users/${userId}/conversations`)
    .where("updatedAt", ">=", Timestamp.fromDate(start))
    .where("updatedAt", "<=", Timestamp.fromDate(end))
    .get();

  if (convsSnap.empty) return null;

  // 各会話のメッセージ数を集計
  const convData: { id: string; msgCount: number; conv: Conversation }[] = [];
  for (const doc of convsSnap.docs) {
    const conv = doc.data() as Conversation;
    convData.push({
      id: conv.conversationId,
      msgCount: conv.messageCount,
      conv,
    });
  }

  // 配分
  const allocations = allocateQuestions(
    convData.map((c) => ({ id: c.id, msgCount: c.msgCount })),
    settings.dailyQuizMaxTotal,
    settings.dailyQuizMaxPerConversation
  );

  if (allocations.length === 0) return null;

  // 会話ごとにQ&Aを生成
  const startTime = Date.now();
  const allCards: DailyQuiz["cards"] = [];
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  for (const alloc of allocations) {
    // メッセージ取得
    const msgsSnap = await db
      .collection(
        `users/${userId}/conversations/${alloc.conversationId}/messages`
      )
      .orderBy("createdAt", "asc")
      .limit(30)
      .get();

    const messages = msgsSnap.docs.map((d) => d.data() as Message);
    if (messages.length === 0) continue;

    const conversationText = messages
      .map(
        (m) =>
          `[${m.role}] (messageId: ${m.messageId})\n${m.content}`
      )
      .join("\n\n---\n\n");

    const fullText = `### 会話ID: ${alloc.conversationId}\n\n${conversationText}`;

    const result = await generateDailyQuizCards(
      fullText,
      alloc.allocatedQuestions
    );

    allCards.push(...result.cards);
    totalPromptTokens += result.promptTokens;
    totalCompletionTokens += result.completionTokens;
  }

  if (allCards.length === 0) return null;

  // 保存
  const quizId = `${targetDate}_v1`;
  const quiz: DailyQuiz = {
    quizId,
    targetDate,
    version: 1,
    isActive: true,
    cards: allCards,
    idempotencyKey,
    generationModel: "gemini-2.0-flash-001",
    promptTokens: totalPromptTokens,
    completionTokens: totalCompletionTokens,
    generatedAt: Timestamp.now(),
    expireAt: Timestamp.fromDate(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    ),
  };

  await saveDailyQuiz(userId, quiz);

  await saveGenerationLog(userId, {
    logId: uuidv4(),
    type: "daily_quiz",
    model: "gemini-2.0-flash-001",
    promptTokens: totalPromptTokens,
    completionTokens: totalCompletionTokens,
    totalTokens: totalPromptTokens + totalCompletionTokens,
    latencyMs: Date.now() - startTime,
    success: true,
  });

  return quiz;
}
