import { chatModel } from "./client";
import type { Content } from "@google-cloud/vertexai";

export interface TermContext {
  termId?: string;
  surface: string;
  reading?: string;
  definition: string;
  category?: string;
}

export interface TermFollowupTurn {
  question: string;
  answer: string;
}

export interface TermFollowupResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
}

const TERM_FOLLOWUP_SYSTEM_PROMPT = [
  "\u3042\u306A\u305F\u306F\u5B66\u7FD2\u652F\u63F4AI\u3067\u3059\u3002",
  "\u7528\u8A9E\u306E\u88DC\u8DB3\u8AAC\u660E\u3092\u3001\u77ED\u304F\u5177\u4F53\u7684\u306B\u65E5\u672C\u8A9E\u3067\u7B54\u3048\u3066\u304F\u3060\u3055\u3044\u3002",
  "\u4E0D\u78BA\u304B\u306A\u5185\u5BB9\u306F\u65AD\u5B9A\u305B\u305A\u3001\u63A8\u6E2C\u3067\u3042\u308B\u3053\u3068\u3092\u660E\u793A\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
  "\u56DE\u7B54\u306F2\u301C6\u6587\u7A0B\u5EA6\u3092\u57FA\u672C\u306B\u3057\u3001\u5FC5\u8981\u306A\u3068\u304D\u3060\u3051\u77ED\u3044\u7B87\u6761\u66F8\u304D\u3092\u4F7F\u3063\u3066\u304F\u3060\u3055\u3044\u3002",
].join("\n");

function sanitizeText(value: string | undefined, maxLength: number): string {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function buildPrompt(
  term: TermContext,
  question: string,
  history: TermFollowupTurn[]
): string {
  const normalizedHistory = history
    .map((turn, index) => {
      const q = sanitizeText(turn.question, 220);
      const a = sanitizeText(turn.answer, 420);
      if (!q || !a) return "";
      return `Q${index + 1}: ${q}\nA${index + 1}: ${a}`;
    })
    .filter(Boolean)
    .join("\n\n");

  const historySection = normalizedHistory || "\u306A\u3057";

  return [
    "\u6B21\u306E\u7528\u8A9E\u60C5\u5831\u3068\u88DC\u8DB3\u5C65\u6B74\u3092\u8E0F\u307E\u3048\u3066\u3001\u8FFD\u52A0\u8CEA\u554F\u306B\u7B54\u3048\u3066\u304F\u3060\u3055\u3044\u3002",
    "",
    `\u7528\u8A9E: ${sanitizeText(term.surface, 80)}`,
    term.reading ? `\u8AAD\u307F: ${sanitizeText(term.reading, 80)}` : "",
    term.category ? `\u5206\u985E: ${sanitizeText(term.category, 40)}` : "",
    `\u57FA\u672C\u8AAC\u660E: ${sanitizeText(term.definition, 500)}`,
    "",
    `\u88DC\u8DB3\u5C65\u6B74:\n${historySection}`,
    "",
    `\u8FFD\u52A0\u8CEA\u554F: ${sanitizeText(question, 320)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateTermFollowupAnswer(
  term: TermContext,
  question: string,
  history: TermFollowupTurn[] = []
): Promise<TermFollowupResult> {
  const prompt = buildPrompt(term, question, history.slice(-6));

  const contents: Content[] = [
    {
      role: "user",
      parts: [{ text: prompt }],
    },
  ];

  const result = await chatModel.generateContent({
    contents,
    systemInstruction: {
      role: "user",
      parts: [{ text: TERM_FOLLOWUP_SYSTEM_PROMPT }],
    },
  });

  const response = result.response;
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  const usage = response.usageMetadata;

  return {
    text,
    promptTokens: usage?.promptTokenCount || 0,
    completionTokens: usage?.candidatesTokenCount || 0,
  };
}
