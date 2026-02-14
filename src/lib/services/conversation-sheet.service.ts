import {
  createConversationSheet,
  getConversationSheet,
  saveGenerationLog,
  updateConversationSheet,
} from "@/lib/firestore/repository";
import { generateConversationSheet } from "@/lib/vertex-ai/conversation-sheet";
import { MODEL_NAME } from "@/lib/vertex-ai/client";
import type { Message } from "@/types/message";
import type { ConversationSheet } from "@/types/conversation-sheet";
import { v4 as uuidv4 } from "uuid";

export const AUTO_CONVERSATION_SHEET_ID = "auto";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

export async function syncAutoConversationSheet(
  userId: string,
  conversationId: string,
  messages: Message[]
): Promise<ConversationSheet | null> {
  if (!messages.length) {
    return null;
  }

  const startTime = Date.now();

  try {
    const generated = await generateConversationSheet(messages);
    const existing = await getConversationSheet(
      userId,
      conversationId,
      AUTO_CONVERSATION_SHEET_ID
    );

    const sheet = existing
      ? await updateConversationSheet(
          userId,
          conversationId,
          AUTO_CONVERSATION_SHEET_ID,
          {
            title: generated.title,
            markdown: generated.markdown,
          }
        )
      : await createConversationSheet(
          userId,
          conversationId,
          AUTO_CONVERSATION_SHEET_ID,
          generated.title,
          generated.markdown
        );

    await saveGenerationLog(userId, {
      logId: uuidv4(),
      type: "conversation_sheet",
      model: MODEL_NAME,
      promptTokens: generated.promptTokens,
      completionTokens: generated.completionTokens,
      totalTokens: generated.promptTokens + generated.completionTokens,
      latencyMs: Date.now() - startTime,
      success: true,
    });

    return sheet;
  } catch (error) {
    await saveGenerationLog(userId, {
      logId: uuidv4(),
      type: "conversation_sheet",
      model: MODEL_NAME,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      latencyMs: Date.now() - startTime,
      success: false,
      errorMessage: toErrorMessage(error),
    });

    throw error;
  }
}
