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

// POST /api/v1/conversations/:id/messages — メッセージ送信 → AI応答 + 素材生成
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

  // レート制限チェック
  const rateLimitResult = await checkRateLimit(userId, RATE_LIMITS.chat);
  if (rateLimitResult) return rateLimitResult;

  // 会話の存在確認
  const conversation = await getConversation(userId, conversationId);
  if (!conversation) {
    return NextResponse.json(
      { error: { code: "CONVERSATION_NOT_FOUND", message: "会話が見つかりません。" } },
      { status: 404 }
    );
  }

  const body = await req.json();
  const content = body.content?.trim();

  if (!content) {
    return NextResponse.json(
      { error: { code: "EMPTY_MESSAGE", message: "メッセージが空です。" } },
      { status: 400 }
    );
  }

  // 1. ユーザーメッセージを保存
  const userMessageId = uuidv4();
  const userMessage = await addMessage(userId, conversationId, {
    messageId: userMessageId,
    role: "user",
    content,
  });

  // 2. 会話履歴を取得（直近20件）
  const history = await getMessages(userId, conversationId, 20);

  // 3. Gemini呼び出し（チャット応答）
  const startTime = Date.now();
  let chatResult;
  try {
    chatResult = await generateChatResponse(
      history.slice(0, -1),
      content
    );
  } catch (error) {
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

    return NextResponse.json(
      { error: { code: "AI_ERROR", message: "AI応答の生成に失敗しました。" } },
      { status: 500 }
    );
  }

  const latencyMs = Date.now() - startTime;

  // 4. アシスタントメッセージを保存
  const assistantMessageId = uuidv4();
  const assistantMessage = await addMessage(userId, conversationId, {
    messageId: assistantMessageId,
    role: "assistant",
    content: chatResult.text,
    activeMaterialVersion: 1,
  });

  // 5. GenerationLog保存
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

  // 6. 素材生成（要約 + 用語 + メンション）
  let material = null;
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
    // 素材生成失敗はチャット応答に影響させない
  }

  // 7. 最初のメッセージなら会話タイトルを自動生成
  if (conversation.messageCount === 0) {
    try {
      const title = await generateConversationTitle(content);
      if (title) {
        await updateConversationTitle(userId, conversationId, title);
      }
    } catch {
      // タイトル生成失敗は無視
    }
  }

  const result = { userMessage, assistantMessage, material };

  // 8. 冪等キー保存
  await saveIdempotency(key, result);

  return NextResponse.json(result, { status: 201 });
}
