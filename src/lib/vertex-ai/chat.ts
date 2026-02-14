import { chatModel } from "./client";
import { CHAT_SYSTEM_PROMPT } from "@/lib/prompts/chat";
import type { Message } from "@/types/message";
import type { Content } from "@google-cloud/vertexai";

interface ChatResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
}

const TITLE_TARGET_LENGTH = 12;
const TITLE_MAX_LENGTH = 20;

function clampTitleLength(text: string): string {
  return Array.from(text).slice(0, TITLE_MAX_LENGTH).join("");
}

function buildContents(history: Message[], userMessage: string): Content[] {
  const contents: Content[] = [];
  const recent = history.slice(-20);

  for (const msg of recent) {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    });
  }

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
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const usage = response.usageMetadata;

  return {
    text,
    promptTokens: usage?.promptTokenCount || 0,
    completionTokens: usage?.candidatesTokenCount || 0,
  };
}

export async function generateConversationTitle(
  userMessage: string,
  assistantMessage?: string
): Promise<string> {
  const result = await chatModel.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "以下の会話情報から、会話一覧に表示する短い日本語タイトルを1つ作成してください。",
              "要件:",
              `- 目安は${TITLE_TARGET_LENGTH}文字前後、最大${TITLE_MAX_LENGTH}文字`,
              "- 会話の主題を要約する（質問文をそのまま短縮しない）",
              "- 疑問形や口語を避け、名詞句でまとめる",
              '- 例: 「なんで通勤手当に社会保険料がかかるんですか？」 -> 「通勤手当に社会保険料がかかる理由」',
              "- タイトル本文のみを出力（改行・引用符なし）",
              "",
              `ユーザー初回メッセージ: ${userMessage}`,
              `AI初回応答: ${assistantMessage ?? ""}`,
            ].join("\n"),
          },
        ],
      },
    ],
  });

  const title = result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const cleaned = title
    .replace(/[\r\n]+/g, " ")
    .replace(/[「」『』【】"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return clampTitleLength(cleaned);
}
