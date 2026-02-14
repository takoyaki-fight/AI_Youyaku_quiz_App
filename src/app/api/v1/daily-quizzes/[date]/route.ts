import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/middleware/auth";
import { getActiveDailyQuiz } from "@/lib/firestore/repository";
import { db } from "@/lib/firebase/admin";
import type { DailyQuiz } from "@/types/daily-quiz";

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

interface SourceResolverContext {
  sourceToConversationCache: Map<string, string | null>;
  collectionGroupUnavailable: boolean;
  userConversationIdsPromise: Promise<string[]> | null;
}

async function resolveConversationIdFromSource(
  userId: string,
  sourceMessageId: string,
  context: SourceResolverContext
): Promise<string | null> {
  if (context.sourceToConversationCache.has(sourceMessageId)) {
    return context.sourceToConversationCache.get(sourceMessageId) || null;
  }

  let resolvedConversationId: string | null = null;

  if (!context.collectionGroupUnavailable) {
    try {
      const snap = await db
        .collectionGroup("messages")
        .where("messageId", "==", sourceMessageId)
        .limit(10)
        .get();

      const matchedDoc = snap.docs.find((doc) =>
        doc.ref.path.startsWith(`users/${userId}/conversations/`)
      );
      resolvedConversationId = matchedDoc
        ? matchedDoc.ref.parent.parent?.id || null
        : null;
    } catch (error) {
      if (isMissingIndexError(error)) {
        context.collectionGroupUnavailable = true;
      } else {
        throw error;
      }
    }
  }

  if (!resolvedConversationId && context.collectionGroupUnavailable) {
    if (!context.userConversationIdsPromise) {
      context.userConversationIdsPromise = db
        .collection(`users/${userId}/conversations`)
        .get()
        .then((snap) => snap.docs.map((doc) => doc.id));
    }

    const conversationIds = await context.userConversationIdsPromise;
    for (const conversationId of conversationIds) {
      const messageDoc = await db
        .doc(`users/${userId}/conversations/${conversationId}/messages/${sourceMessageId}`)
        .get();
      if (messageDoc.exists) {
        resolvedConversationId = conversationId;
        break;
      }
    }
  }

  context.sourceToConversationCache.set(sourceMessageId, resolvedConversationId);
  return resolvedConversationId;
}

async function normalizeQuizConversationIds(
  userId: string,
  quiz: DailyQuiz
): Promise<DailyQuiz> {
  if (!Array.isArray(quiz.cards) || quiz.cards.length === 0) {
    return quiz;
  }

  const uniqueConversationIds = Array.from(
    new Set(
      quiz.cards
        .map((card) => card.conversationId)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );

  const conversationExists = new Map<string, boolean>();
  await Promise.all(
    uniqueConversationIds.map(async (conversationId) => {
      const doc = await db
        .doc(`users/${userId}/conversations/${conversationId}`)
        .get();
      conversationExists.set(conversationId, doc.exists);
    })
  );

  const resolverContext: SourceResolverContext = {
    sourceToConversationCache: new Map<string, string | null>(),
    collectionGroupUnavailable: false,
    userConversationIdsPromise: null,
  };
  let changed = false;

  const normalizedCards = await Promise.all(
    quiz.cards.map(async (card) => {
      const currentConversationId =
        typeof card.conversationId === "string" ? card.conversationId : "";

      if (currentConversationId && conversationExists.get(currentConversationId)) {
        return card;
      }

      for (const sourceMessageId of card.sources || []) {
        if (typeof sourceMessageId !== "string" || sourceMessageId.length === 0) {
          continue;
        }

        let resolvedConversationId: string | null = null;
        try {
          resolvedConversationId = await resolveConversationIdFromSource(
            userId,
            sourceMessageId,
            resolverContext
          );
        } catch (error) {
          console.warn(
            "Failed to resolve conversation from source message ID:",
            sourceMessageId,
            error
          );
          continue;
        }

        if (resolvedConversationId) {
          changed = true;
          return { ...card, conversationId: resolvedConversationId };
        }
      }

      if (currentConversationId) {
        changed = true;
        return { ...card, conversationId: "" };
      }

      return card;
    })
  );

  return changed ? { ...quiz, cards: normalizedCards } : quiz;
}

// GET /api/v1/daily-quizzes/:date - active quiz for date
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const { date } = await params;
  const quiz = await getActiveDailyQuiz(authResult.userId, date);

  if (!quiz) {
    return NextResponse.json(
      { error: { code: "QUIZ_NOT_FOUND", message: "Quiz not found" } },
      { status: 404 }
    );
  }

  try {
    const normalizedQuiz = await normalizeQuizConversationIds(authResult.userId, quiz);
    return NextResponse.json({ quiz: normalizedQuiz });
  } catch (error) {
    console.warn("Failed to normalize quiz conversation links:", error);
    return NextResponse.json({ quiz });
  }
}
