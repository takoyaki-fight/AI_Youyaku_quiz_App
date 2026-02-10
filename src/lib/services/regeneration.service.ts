import { db } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import {
  getMessages,
  getConversation,
  saveMaterial,
  saveDailyQuiz,
  saveGenerationLog,
} from "@/lib/firestore/repository";
import { generateMaterial } from "@/lib/vertex-ai/material";
import { generateDailyQuizCards } from "@/lib/vertex-ai/daily-quiz";
import type { Material } from "@/types/material";
import type { DailyQuiz } from "@/types/daily-quiz";
import type { Message } from "@/types/message";
import { v4 as uuidv4 } from "uuid";

// ─── 素材再生成 ─────────────────────────────────────

export async function regenerateMaterial(
  userId: string,
  conversationId: string,
  messageId: string
): Promise<{ material: Material; previousVersion: number; currentVersion: number }> {
  // 現在のmax versionを取得
  const versionsSnap = await db
    .collection(`users/${userId}/conversations/${conversationId}/materials`)
    .where("messageId", "==", messageId)
    .orderBy("version", "desc")
    .limit(1)
    .get();

  const maxVersion = versionsSnap.empty
    ? 0
    : (versionsSnap.docs[0].data() as Material).version;
  const newVersion = maxVersion + 1;

  // 会話情報
  const conversation = await getConversation(userId, conversationId);
  if (!conversation) throw new Error("Conversation not found");

  // メッセージ取得
  const messages = await getMessages(userId, conversationId, 20);
  const targetMsg = messages.find((m) => m.messageId === messageId);
  if (!targetMsg || targetMsg.role !== "assistant") {
    throw new Error("Target assistant message not found");
  }

  // 素材生成
  const startTime = Date.now();
  const result = await generateMaterial(messages, targetMsg.content);

  const materialId = `${messageId}_v${newVersion}`;
  const material: Material = {
    materialId,
    messageId,
    version: newVersion,
    isActive: true,
    summary: result.summary,
    terms: result.terms,
    mentions: result.mentions,
    idempotencyKey: materialId,
    generationModel: "gemini-2.0-flash-001",
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    generatedAt: Timestamp.now(),
    expireAt: conversation.expireAt,
  };

  // トランザクション: 旧active→false、新版→active
  const batch = db.batch();

  if (!versionsSnap.empty) {
    for (const doc of versionsSnap.docs) {
      if ((doc.data() as Material).isActive) {
        batch.update(doc.ref, { isActive: false });
      }
    }
    // 全active版を無効化
    const allActiveSnap = await db
      .collection(`users/${userId}/conversations/${conversationId}/materials`)
      .where("messageId", "==", messageId)
      .where("isActive", "==", true)
      .get();
    for (const doc of allActiveSnap.docs) {
      batch.update(doc.ref, { isActive: false });
    }
  }

  const newRef = db.doc(
    `users/${userId}/conversations/${conversationId}/materials/${materialId}`
  );
  batch.set(newRef, material);

  // メッセージのactiveMaterialVersionを更新
  const msgRef = db.doc(
    `users/${userId}/conversations/${conversationId}/messages/${messageId}`
  );
  batch.update(msgRef, { activeMaterialVersion: newVersion });

  await batch.commit();

  // ログ
  await saveGenerationLog(userId, {
    logId: uuidv4(),
    type: "regeneration",
    model: "gemini-2.0-flash-001",
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    totalTokens: result.promptTokens + result.completionTokens,
    latencyMs: Date.now() - startTime,
    success: true,
  });

  return { material, previousVersion: maxVersion, currentVersion: newVersion };
}

// ─── Q&A再生成 ──────────────────────────────────────

export async function regenerateDailyQuiz(
  userId: string,
  targetDate: string
): Promise<{ quiz: DailyQuiz; previousVersion: number; currentVersion: number }> {
  // 現在のmax versionを取得
  const versionsSnap = await db
    .collection(`users/${userId}/dailyQuizzes`)
    .where("targetDate", "==", targetDate)
    .orderBy("version", "desc")
    .limit(1)
    .get();

  const maxVersion = versionsSnap.empty
    ? 0
    : (versionsSnap.docs[0].data() as DailyQuiz).version;
  const newVersion = maxVersion + 1;

  // 元のQ&Aからconversation情報を取得して再生成
  const originalQuiz = versionsSnap.empty
    ? null
    : (versionsSnap.docs[0].data() as DailyQuiz);

  // 会話IDを集約
  const convIds = new Set<string>();
  if (originalQuiz) {
    for (const card of originalQuiz.cards) {
      if (card.conversationId) convIds.add(card.conversationId);
    }
  }

  // 会話のメッセージを取得してQ&A再生成
  const startTime = Date.now();
  let allText = "";
  let totalCards = 0;

  for (const convId of convIds) {
    const msgsSnap = await db
      .collection(`users/${userId}/conversations/${convId}/messages`)
      .orderBy("createdAt", "asc")
      .limit(30)
      .get();

    const messages = msgsSnap.docs.map((d) => d.data() as Message);
    const text = messages
      .map((m) => `[${m.role}] (messageId: ${m.messageId})\n${m.content}`)
      .join("\n\n---\n\n");

    allText += `### 会話ID: ${convId}\n\n${text}\n\n`;
    totalCards += 5; // 会話あたりデフォルト5問
  }

  if (!allText) {
    throw new Error("No conversations found for regeneration");
  }

  const result = await generateDailyQuizCards(allText, Math.min(totalCards, 20));

  const quizId = `${targetDate}_v${newVersion}`;
  const quiz: DailyQuiz = {
    quizId,
    targetDate,
    version: newVersion,
    isActive: true,
    cards: result.cards,
    idempotencyKey: `${userId}_${targetDate}_v${newVersion}`,
    generationModel: "gemini-2.0-flash-001",
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    generatedAt: Timestamp.now(),
    expireAt: Timestamp.fromDate(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    ),
  };

  // 旧active→false
  const batch = db.batch();
  const allActiveSnap = await db
    .collection(`users/${userId}/dailyQuizzes`)
    .where("targetDate", "==", targetDate)
    .where("isActive", "==", true)
    .get();
  for (const doc of allActiveSnap.docs) {
    batch.update(doc.ref, { isActive: false });
  }

  const newRef = db.doc(`users/${userId}/dailyQuizzes/${quizId}`);
  batch.set(newRef, quiz);
  await batch.commit();

  await saveGenerationLog(userId, {
    logId: uuidv4(),
    type: "regeneration",
    model: "gemini-2.0-flash-001",
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    totalTokens: result.promptTokens + result.completionTokens,
    latencyMs: Date.now() - startTime,
    success: true,
  });

  return { quiz, previousVersion: maxVersion, currentVersion: newVersion };
}

// ─── Active版切替 ───────────────────────────────────

export async function switchActiveMaterialVersion(
  userId: string,
  conversationId: string,
  messageId: string,
  targetVersion: number
): Promise<void> {
  const basePath = `users/${userId}/conversations/${conversationId}/materials`;

  // ターゲットバージョンの存在確認
  const targetId = `${messageId}_v${targetVersion}`;
  const targetDoc = await db.doc(`${basePath}/${targetId}`).get();
  if (!targetDoc.exists) {
    throw new Error(`Version ${targetVersion} not found`);
  }

  const batch = db.batch();

  // 現在のactive版をfalseに
  const activeSnap = await db
    .collection(basePath)
    .where("messageId", "==", messageId)
    .where("isActive", "==", true)
    .get();
  for (const doc of activeSnap.docs) {
    batch.update(doc.ref, { isActive: false });
  }

  // ターゲットをtrueに
  batch.update(targetDoc.ref, { isActive: true });

  // メッセージのactiveMaterialVersionを更新
  const msgRef = db.doc(
    `users/${userId}/conversations/${conversationId}/messages/${messageId}`
  );
  batch.update(msgRef, { activeMaterialVersion: targetVersion });

  await batch.commit();
}

export async function switchActiveDailyQuizVersion(
  userId: string,
  targetDate: string,
  targetVersion: number
): Promise<void> {
  const quizId = `${targetDate}_v${targetVersion}`;
  const targetDoc = await db
    .doc(`users/${userId}/dailyQuizzes/${quizId}`)
    .get();
  if (!targetDoc.exists) {
    throw new Error(`Version ${targetVersion} not found`);
  }

  const batch = db.batch();

  const activeSnap = await db
    .collection(`users/${userId}/dailyQuizzes`)
    .where("targetDate", "==", targetDate)
    .where("isActive", "==", true)
    .get();
  for (const doc of activeSnap.docs) {
    batch.update(doc.ref, { isActive: false });
  }

  batch.update(targetDoc.ref, { isActive: true });
  await batch.commit();
}
