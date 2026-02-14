import { db } from "@/lib/firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { User } from "@/types/user";
import type { Conversation } from "@/types/conversation";
import type { ConversationSheet } from "@/types/conversation-sheet";
import type { Message } from "@/types/message";
import type { Material } from "@/types/material";
import type { DailyQuiz } from "@/types/daily-quiz";
import type { UserSettings } from "@/types/settings";
import type { GenerationLog } from "@/types/generation-log";
import { DEFAULT_SETTINGS } from "@/types/settings";

const TTL_DAYS = 30;

function expireAt(baseDate?: Date): Timestamp {
  const date = baseDate || new Date();
  return Timestamp.fromDate(
    new Date(date.getTime() + TTL_DAYS * 24 * 60 * 60 * 1000)
  );
}

// ─── Users ──────────────────────────────────────────

export async function upsertUser(
  userId: string,
  email: string,
  displayName: string
): Promise<void> {
  const ref = db.doc(`users/${userId}`);
  const doc = await ref.get();
  if (doc.exists) {
    await ref.update({ email, displayName, updatedAt: FieldValue.serverTimestamp() });
  } else {
    const user: Omit<User, "createdAt" | "updatedAt"> & {
      createdAt: FieldValue;
      updatedAt: FieldValue;
    } = {
      userId,
      email,
      displayName,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await ref.set(user);
  }
}

// ─── Settings ───────────────────────────────────────

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const ref = db.doc(`users/${userId}/settings/default`);
  const doc = await ref.get();
  if (doc.exists) {
    return doc.data() as UserSettings;
  }
  // デフォルト設定を作成
  const settings = {
    ...DEFAULT_SETTINGS,
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(settings);
  const created = await ref.get();
  return created.data() as UserSettings;
}

export async function updateUserSettings(
  userId: string,
  updates: Partial<Omit<UserSettings, "updatedAt">>
): Promise<UserSettings> {
  const ref = db.doc(`users/${userId}/settings/default`);
  await ref.set(
    { ...updates, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  const doc = await ref.get();
  return doc.data() as UserSettings;
}

// ─── Conversations ──────────────────────────────────

export async function createConversation(
  userId: string,
  conversationId: string,
  title: string
): Promise<Conversation> {
  const ref = db.doc(`users/${userId}/conversations/${conversationId}`);
  const now = Timestamp.now();
  const data = {
    conversationId,
    title,
    createdAt: now,
    updatedAt: now,
    expireAt: expireAt(),
    messageCount: 0,
  };
  await ref.set(data);
  return data;
}

export async function getConversation(
  userId: string,
  conversationId: string
): Promise<Conversation | null> {
  const doc = await db
    .doc(`users/${userId}/conversations/${conversationId}`)
    .get();
  return doc.exists ? (doc.data() as Conversation) : null;
}

export async function listConversations(
  userId: string
): Promise<Conversation[]> {
  const snap = await db
    .collection(`users/${userId}/conversations`)
    .orderBy("updatedAt", "desc")
    .limit(50)
    .get();
  return snap.docs.map((d) => d.data() as Conversation);
}

export async function deleteConversationCascade(
  userId: string,
  conversationId: string
): Promise<void> {
  const batch = db.batch();
  const basePath = `users/${userId}/conversations/${conversationId}`;

  // messages サブコレクション削除
  const messages = await db.collection(`${basePath}/messages`).listDocuments();
  messages.forEach((doc) => batch.delete(doc));

  // materials サブコレクション削除
  const materials = await db
    .collection(`${basePath}/materials`)
    .listDocuments();
  materials.forEach((doc) => batch.delete(doc));
  const sheets = await db.collection(`${basePath}/sheets`).listDocuments();
  sheets.forEach((doc) => batch.delete(doc));

  // 会話ドキュメント本体を削除
  batch.delete(db.doc(basePath));

  await batch.commit();

  // dailyQuizzes からこの会話由来のカードを除去（別トランザクション）
  await purgeDailyQuizCards(userId, conversationId);
}

async function purgeDailyQuizCards(
  userId: string,
  conversationId: string
): Promise<void> {
  const quizzesSnap = await db
    .collection(`users/${userId}/dailyQuizzes`)
    .get();

  const batch = db.batch();
  for (const doc of quizzesSnap.docs) {
    const quiz = doc.data() as DailyQuiz;
    const remaining = quiz.cards.filter(
      (c) => c.conversationId !== conversationId
    );
    if (remaining.length === quiz.cards.length) continue;

    if (remaining.length === 0) {
      batch.delete(doc.ref);
    } else {
      batch.update(doc.ref, { cards: remaining });
    }
  }
  await batch.commit();
}

export async function updateConversationTitle(
  userId: string,
  conversationId: string,
  title: string
): Promise<void> {
  await db.doc(`users/${userId}/conversations/${conversationId}`).update({
    title,
  });
}

// ─── Messages ───────────────────────────────────────

export async function listConversationSheets(
  userId: string,
  conversationId: string,
  limit = 100
): Promise<ConversationSheet[]> {
  const snap = await db
    .collection(`users/${userId}/conversations/${conversationId}/sheets`)
    .orderBy("updatedAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as ConversationSheet);
}

export interface SummarySheetListItem {
  conversationId: string;
  conversationTitle: string;
  sheetId: string;
  title: string;
  markdown: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export async function listSummarySheets(
  userId: string,
  limit = 50
): Promise<SummarySheetListItem[]> {
  const conversations = await listConversations(userId);

  const rows = await Promise.all(
    conversations.map(async (conversation) => {
      const sheets = await listConversationSheets(
        userId,
        conversation.conversationId,
        1
      );
      const latest = sheets[0];
      if (!latest) {
        return null;
      }

      return {
        conversationId: conversation.conversationId,
        conversationTitle: conversation.title,
        sheetId: latest.sheetId,
        title: latest.title,
        markdown: latest.markdown,
        createdAt: latest.createdAt,
        updatedAt: latest.updatedAt,
      } satisfies SummarySheetListItem;
    })
  );

  return rows
    .filter((row): row is SummarySheetListItem => row !== null)
    .sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis())
    .slice(0, limit);
}

export async function createConversationSheet(
  userId: string,
  conversationId: string,
  sheetId: string,
  title: string,
  markdown: string
): Promise<ConversationSheet> {
  const conversationRef = db.doc(`users/${userId}/conversations/${conversationId}`);
  const conversationDoc = await conversationRef.get();

  if (!conversationDoc.exists) {
    throw new Error("CONVERSATION_NOT_FOUND");
  }

  const conversation = conversationDoc.data() as Conversation;
  const now = Timestamp.now();
  const data: ConversationSheet = {
    sheetId,
    title,
    markdown,
    createdAt: now,
    updatedAt: now,
    expireAt: conversation.expireAt,
  };

  const sheetRef = db.doc(
    `users/${userId}/conversations/${conversationId}/sheets/${sheetId}`
  );
  await sheetRef.set(data);
  await conversationRef.update({ updatedAt: FieldValue.serverTimestamp() });
  return data;
}

export async function getConversationSheet(
  userId: string,
  conversationId: string,
  sheetId: string
): Promise<ConversationSheet | null> {
  const doc = await db
    .doc(`users/${userId}/conversations/${conversationId}/sheets/${sheetId}`)
    .get();
  return doc.exists ? (doc.data() as ConversationSheet) : null;
}

export async function updateConversationSheet(
  userId: string,
  conversationId: string,
  sheetId: string,
  updates: Partial<Pick<ConversationSheet, "title" | "markdown">>
): Promise<ConversationSheet> {
  const ref = db.doc(
    `users/${userId}/conversations/${conversationId}/sheets/${sheetId}`
  );

  const payload: Partial<ConversationSheet> = {
    updatedAt: Timestamp.now(),
  };

  if (typeof updates.title === "string") {
    payload.title = updates.title;
  }
  if (typeof updates.markdown === "string") {
    payload.markdown = updates.markdown;
  }

  await ref.update(payload);
  await db.doc(`users/${userId}/conversations/${conversationId}`).update({
    updatedAt: FieldValue.serverTimestamp(),
  });

  const doc = await ref.get();
  return doc.data() as ConversationSheet;
}

export async function deleteConversationSheet(
  userId: string,
  conversationId: string,
  sheetId: string
): Promise<void> {
  await db
    .doc(`users/${userId}/conversations/${conversationId}/sheets/${sheetId}`)
    .delete();
  await db.doc(`users/${userId}/conversations/${conversationId}`).update({
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function addMessage(
  userId: string,
  conversationId: string,
  message: Omit<Message, "createdAt" | "expireAt">
): Promise<Message> {
  const convRef = db.doc(`users/${userId}/conversations/${conversationId}`);
  const conv = await convRef.get();
  const convExpireAt = (conv.data() as Conversation).expireAt;

  const ref = db.doc(
    `users/${userId}/conversations/${conversationId}/messages/${message.messageId}`
  );
  const now = Timestamp.now();
  const data: Message = {
    ...message,
    createdAt: now,
    expireAt: convExpireAt,
  };
  await ref.set(data);

  // messageCount をインクリメント
  await convRef.update({
    messageCount: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return data;
}

export async function getMessages(
  userId: string,
  conversationId: string,
  limit = 50
): Promise<Message[]> {
  const snap = await db
    .collection(
      `users/${userId}/conversations/${conversationId}/messages`
    )
    .orderBy("createdAt", "asc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as Message);
}

// ─── Materials ──────────────────────────────────────

export async function saveMaterial(
  userId: string,
  conversationId: string,
  material: Material
): Promise<void> {
  const ref = db.doc(
    `users/${userId}/conversations/${conversationId}/materials/${material.materialId}`
  );
  await ref.set(material);
}

export async function getActiveMaterial(
  userId: string,
  conversationId: string,
  messageId: string
): Promise<Material | null> {
  const snap = await db
    .collection(`users/${userId}/conversations/${conversationId}/materials`)
    .where("messageId", "==", messageId)
    .where("isActive", "==", true)
    .limit(1)
    .get();
  return snap.empty ? null : (snap.docs[0].data() as Material);
}

export async function getMaterialVersions(
  userId: string,
  conversationId: string,
  messageId: string
): Promise<Material[]> {
  const snap = await db
    .collection(`users/${userId}/conversations/${conversationId}/materials`)
    .where("messageId", "==", messageId)
    .orderBy("version", "desc")
    .get();
  return snap.docs.map((d) => d.data() as Material);
}

// ─── Daily Quizzes ──────────────────────────────────

export async function saveDailyQuiz(
  userId: string,
  quiz: DailyQuiz
): Promise<void> {
  const ref = db.doc(`users/${userId}/dailyQuizzes/${quiz.quizId}`);
  await ref.set(quiz);
}

export async function getActiveDailyQuiz(
  userId: string,
  targetDate: string
): Promise<DailyQuiz | null> {
  const quizzesRef = db.collection(`users/${userId}/dailyQuizzes`);

  try {
    const snap = await quizzesRef
      .where("targetDate", "==", targetDate)
      .where("isActive", "==", true)
      .limit(1)
      .get();
    return snap.empty ? null : (snap.docs[0].data() as DailyQuiz);
  } catch (error) {
    if (!isMissingIndexError(error)) {
      throw error;
    }

    const fallbackSnap = await quizzesRef
      .where("targetDate", "==", targetDate)
      .get();
    const activeQuizzes = fallbackSnap.docs
      .map((d) => d.data() as DailyQuiz)
      .filter((quiz) => quiz.isActive);

    if (!activeQuizzes.length) {
      return null;
    }

    activeQuizzes.sort((a, b) => b.version - a.version);
    return activeQuizzes[0];
  }
}

export async function listDailyQuizzes(
  userId: string,
  limit = 30
): Promise<DailyQuiz[]> {
  const quizzesRef = db.collection(`users/${userId}/dailyQuizzes`);

  try {
    const snap = await quizzesRef
      .where("isActive", "==", true)
      .orderBy("targetDate", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => d.data() as DailyQuiz);
  } catch (error) {
    if (!isMissingIndexError(error)) {
      throw error;
    }

    const fallbackLimit = Math.max(limit * 3, 100);
    const fallbackSnap = await quizzesRef
      .orderBy("targetDate", "desc")
      .limit(fallbackLimit)
      .get();

    return fallbackSnap.docs
      .map((d) => d.data() as DailyQuiz)
      .filter((quiz) => quiz.isActive)
      .slice(0, limit);
  }
}

function isMissingIndexError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as { code?: unknown; message?: unknown };
  const code = maybeError.code;

  if (
    code === 9 ||
    code === "9" ||
    code === "failed-precondition" ||
    code === "FAILED_PRECONDITION"
  ) {
    return true;
  }

  return (
    typeof maybeError.message === "string" &&
    maybeError.message.includes("requires an index")
  );
}

// ─── Generation Logs ────────────────────────────────

export async function saveGenerationLog(
  userId: string,
  log: Omit<GenerationLog, "createdAt" | "expireAt">
): Promise<void> {
  const ref = db.doc(`users/${userId}/generationLogs/${log.logId}`);
  const now = Timestamp.now();
  await ref.set({
    ...log,
    createdAt: now,
    expireAt: expireAt(),
  });
}

// ─── Idempotency ────────────────────────────────────

export async function checkIdempotency(
  key: string
): Promise<unknown | null> {
  const doc = await db.collection("idempotencyKeys").doc(key).get();
  if (doc.exists) {
    return doc.data()!.result;
  }
  return null;
}

export async function saveIdempotency(
  key: string,
  result: unknown
): Promise<void> {
  await db
    .collection("idempotencyKeys")
    .doc(key)
    .set({
      result,
      createdAt: FieldValue.serverTimestamp(),
      expireAt: Timestamp.fromDate(
        new Date(Date.now() + 24 * 60 * 60 * 1000)
      ),
    });
}
