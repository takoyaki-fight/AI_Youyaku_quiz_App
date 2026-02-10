import { chatModel } from "./client";
import { CHAT_SYSTEM_PROMPT } from "@/lib/prompts/chat";
import type { Message } from "@/types/message";
import type { Content } from "@google-cloud/vertexai";

interface ChatResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
}

function buildContents(history: Message[], userMessage: string): Content[] {
  const contents: Content[] = [];

  // 直近20件に制限
  const recent = history.slice(-20);

  for (const msg of recent) {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    });
  }

  // 新しいユーザーメッセージ
  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  return contents;
}

export async function generateChatResponse(
  history: Message[],
  userMessage: string
): Promise<ChatResult> {
  const contents = buildContents(history, userMessage);

  const result = await chatModel.generateContent({
    contents,
    systemInstruction: {
      role: "user",
      parts: [{ text: CHAT_SYSTEM_PROMPT }],
    },
  });

  const response = result.response;
  const text =
    response.candidates?.[0]?.content?.parts?.[0]?.text || "";

  const usage = response.usageMetadata;

  return {
    text,
    promptTokens: usage?.promptTokenCount || 0,
    completionTokens: usage?.candidatesTokenCount || 0,
  };
}

export async function generateConversationTitle(
  userMessage: string
): Promise<string> {
  const result = await chatModel.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `以下のユーザーメッセージに対して、会話のタイトルを10文字〜20文字程度の日本語で1つだけ生成してください。タイトルのみを出力してください。\n\nメッセージ: ${userMessage}`,
          },
        ],
      },
    ],
  });

  const title =
    result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

  return title.length > 30 ? title.substring(0, 30) : title;
}
