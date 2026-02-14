import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, isAuthError } from "@/lib/middleware/auth";
import {
  checkIdempotencyKey,
  isIdempotencyHit,
} from "@/lib/middleware/idempotency";
import {
  getConversation,
  getMessages,
  addMessage,
  updateConversationTitle,
  saveIdempotency,
  saveGenerationLog,
} from "@/lib/firestore/repository";
import {
  generateChatResponse,
  generateConversationTitle,
} from "@/lib/vertex-ai/chat";
import { generateAndSaveMaterial } from "@/lib/services/material.service";
import { checkRateLimit, RATE_LIMITS } from "@/lib/middleware/rate-limit";
import { MODEL_NAME } from "@/lib/vertex-ai/client";
import { v4 as uuidv4 } from "uuid";

const AI_TIMEOUT_MS = Number(process.env.CHAT_AI_TIMEOUT_MS || 0);
const TITLE_TIMEOUT_MS = Number(process.env.TITLE_AI_TIMEOUT_MS || 2000);

type ChatResult = {
  text: string;
  promptTokens: number;
  completionTokens: number;
};

function buildFallbackAssistantReply(userMessage: string): string {
  return [
    "AI response is temporarily unavailable.",
    "",
    `Your message: ${userMessage}`,
    "",
    "Please retry in a moment.",
  ].join("\n");
}

async function generateChatWithTimeout(
  history: Awaited<ReturnType<typeof getMessages>>,
  content: string
): Promise<ChatResult> {
  const promise = generateChatResponse(history.slice(0, -1), content);

  // If timeout is 0 or negative, disable timeout and wait for model response.
  if (!Number.isFinite(AI_TIMEOUT_MS) || AI_TIMEOUT_MS <= 0) {
    return promise;
  }

  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`AI_TIMEOUT_${AI_TIMEOUT_MS}ms`)),
        AI_TIMEOUT_MS
      )
    ),
  ]);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

// POST /api/v1/conversations/:id/messages
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAuth(req);
  if (isAuthError(authResult)) return authResult;

  const idempResult = await checkIdempotencyKey(req);
  if (isIdempotencyHit(idempResult)) return idempResult;

  const { userId } = authResult;
  const { id: conversationId } = await params;
  const { key } = idempResult;

  const rateLimitResult = await checkRateLimit(userId, RATE_LIMITS.chat);
  if (rateLimitResult) return rateLimitResult;

  const conversation = await getConversation(userId, conversationId);
  if (!conversation) {
    return NextResponse.json(
      { error: { code: "CONVERSATION_NOT_FOUND", message: "Conversation not found." } },
      { status: 404 }
    );
  }

  const body = await req.json();
  const content = body.content?.trim();

  if (!content) {
    return NextResponse.json(
      { error: { code: "EMPTY_MESSAGE", message: "Message is empty." } },
      { status: 400 }
    );
  }

  const userMessageId = uuidv4();
  const userMessage = await addMessage(userId, conversationId, {
    messageId: userMessageId,
    role: "user",
    content,
  });

  const history = await getMessages(userId, conversationId, 20);

  const startTime = Date.now();
  let chatResult: ChatResult;
  let usedFallback = false;

  try {
    chatResult = await generateChatWithTimeout(history, content);
    if (!chatResult.text?.trim()) {
      throw new Error("AI_EMPTY_RESPONSE");
    }
  } catch (error) {
    console.error("Chat generation failed:", error);

    await saveGenerationLog(userId, {
      logId: uuidv4(),
      type: "chat",
      model: MODEL_NAME,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      latencyMs: Date.now() - startTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    usedFallback = true;
    chatResult = {
      text: buildFallbackAssistantReply(content),
      promptTokens: 0,
      completionTokens: 0,
    };
  }

  const latencyMs = Date.now() - startTime;

  const assistantMessageId = uuidv4();
  const assistantPayload = {
    messageId: assistantMessageId,
    role: "assistant" as const,
    content: chatResult.text,
    ...(usedFallback ? {} : { activeMaterialVersion: 1 }),
  };

  const assistantMessage = await addMessage(userId, conversationId, {
    ...assistantPayload,
  });

  if (!usedFallback) {
    await saveGenerationLog(userId, {
      logId: uuidv4(),
      type: "chat",
      model: MODEL_NAME,
      promptTokens: chatResult.promptTokens,
      completionTokens: chatResult.completionTokens,
      totalTokens: chatResult.promptTokens + chatResult.completionTokens,
      latencyMs,
      success: true,
    });
  }

  let material = null;
  if (!usedFallback) {
    try {
      material = await generateAndSaveMaterial(
        userId,
        conversationId,
        assistantMessageId,
        chatResult.text,
        history,
        conversation.expireAt,
        1
      );
    } catch (e) {
      console.error("Material generation failed:", e);
    }
  }

  if (conversation.messageCount === 0) {
    try {
      const title = await withTimeout(
        generateConversationTitle(content),
        TITLE_TIMEOUT_MS
      );
      if (title) {
        await updateConversationTitle(userId, conversationId, title);
      }
    } catch {
      // Ignore title generation failure.
    }
  }

  const result = { userMessage, assistantMessage, material };
  await saveIdempotency(key, result);

  return NextResponse.json(result, { status: 201 });
}
