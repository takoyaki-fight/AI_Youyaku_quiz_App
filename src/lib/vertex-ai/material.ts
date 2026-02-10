import { vertexAI } from "./client";
import {
  buildMaterialPrompt,
  MATERIAL_RESPONSE_SCHEMA,
} from "@/lib/prompts/material";
import type { Message } from "@/types/message";
import type { Term, Mention } from "@/types/material";

interface RawMaterialResult {
  summary: string[];
  terms: Array<{
    termId: string;
    surface: string;
    reading: string;
    definition: string;
    category: string;
    confidence: number;
  }>;
  mentions: Array<{
    termId: string;
    surface: string;
    startOffset: number;
    endOffset: number;
    confidence: number;
  }>;
}

export interface MaterialGenerationResult {
  summary: string[];
  terms: Term[];
  mentions: Mention[];
  promptTokens: number;
  completionTokens: number;
}

// ─── ブラックリスト ────────────────────────────────

const TERM_BLACKLIST = new Set([
  "技術",
  "方法",
  "問題",
  "結果",
  "情報",
  "処理",
  "データ",
  "機能",
  "システム",
  "サービス",
  "プログラム",
  "設計",
  "開発",
  "実装",
  "説明",
  "例",
  "場合",
  "特徴",
  "種類",
  "利用",
  "使用",
  "目的",
  "理由",
  "効果",
  "影響",
  "関係",
  "構造",
  "手順",
  "概要",
  "内容",
]);

const SHORT_TERM_ALLOWLIST = new Set(["AI", "ML", "DB", "OS", "UI", "UX", "API", "IoT"]);

// ─── バリデーション ─────────────────────────────────

function validateMaterial(raw: RawMaterialResult): RawMaterialResult {
  if (!Array.isArray(raw.summary) || raw.summary.length < 1) {
    throw new Error("Invalid summary");
  }
  if (!Array.isArray(raw.terms)) {
    throw new Error("Invalid terms");
  }
  if (!Array.isArray(raw.mentions)) {
    throw new Error("Invalid mentions");
  }

  // termsのフィルタリング
  raw.terms = raw.terms.filter((t) => {
    if (t.confidence < 0.7) return false;
    if (TERM_BLACKLIST.has(t.surface)) return false;
    if (t.surface.length < 2 && !SHORT_TERM_ALLOWLIST.has(t.surface))
      return false;
    return true;
  });

  // mentionsのフィルタリング
  raw.mentions = raw.mentions.filter((m) => {
    if (m.startOffset < 0) return false;
    if (m.endOffset <= m.startOffset) return false;
    if (m.confidence < 0.7) return false;
    // 対応するtermが存在するか
    const termExists = raw.terms.some((t) => t.termId === m.termId);
    if (!termExists) return false;
    // ブラックリスト
    const term = raw.terms.find((t) => t.termId === m.termId);
    if (term && TERM_BLACKLIST.has(term.surface)) return false;
    return true;
  });

  return raw;
}

// ─── オフセット補正 ─────────────────────────────────

function correctMentionOffsets(
  content: string,
  mentions: Mention[]
): Mention[] {
  return mentions
    .map((m) => {
      const extracted = content.substring(m.startOffset, m.endOffset);

      if (extracted === m.surface) {
        return m;
      }

      // 不正確 → indexOf で再検索
      const searchStart = Math.max(0, m.startOffset - 50);
      const idx = content.indexOf(m.surface, searchStart);

      if (idx === -1) {
        // 先頭から全体検索
        const fullIdx = content.indexOf(m.surface);
        if (fullIdx === -1) {
          return { ...m, confidence: 0 };
        }
        return {
          ...m,
          startOffset: fullIdx,
          endOffset: fullIdx + m.surface.length,
        };
      }

      return {
        ...m,
        startOffset: idx,
        endOffset: idx + m.surface.length,
      };
    })
    .filter((m) => m.confidence >= 0.7);
}

// ─── 重複mention排除 ─────────────────────────────────

function deduplicateMentions(mentions: Mention[]): Mention[] {
  const sorted = [...mentions].sort((a, b) => a.startOffset - b.startOffset);
  const result: Mention[] = [];

  for (const m of sorted) {
    const last = result[result.length - 1];
    // 前のmentionと重なっていなければ追加
    if (!last || m.startOffset >= last.endOffset) {
      result.push(m);
    }
  }

  return result;
}

// ─── 会話履歴をテキスト化 ────────────────────────────

function formatHistory(messages: Message[]): string {
  return messages
    .map((m) => `${m.role === "user" ? "ユーザー" : "アシスタント"}: ${m.content}`)
    .join("\n\n");
}

// ─── メイン生成関数 ─────────────────────────────────

export async function generateMaterial(
  history: Message[],
  assistantContent: string
): Promise<MaterialGenerationResult> {
  const conversationText = formatHistory(history.slice(-10));
  const prompt = buildMaterialPrompt(conversationText, assistantContent);

  try {
    // 1st attempt: 構造化出力
    return await generateStructured(prompt, assistantContent);
  } catch (e) {
    console.warn("Structured output failed, trying text mode:", e);

    try {
      // 2nd attempt: テキスト出力 → JSON.parse
      return await generateText(prompt, assistantContent);
    } catch (e2) {
      console.error("Text mode also failed:", e2);

      // 3rd attempt: 最低限の素材
      return {
        summary: ["（素材の自動生成に失敗しました。再生成をお試しください。）"],
        terms: [],
        mentions: [],
        promptTokens: 0,
        completionTokens: 0,
      };
    }
  }
}

async function generateStructured(
  prompt: string,
  assistantContent: string
): Promise<MaterialGenerationResult> {
  const model = vertexAI.getGenerativeModel({
    model: "gemini-2.0-flash-001",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: MATERIAL_RESPONSE_SCHEMA,
    },
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const parsed = JSON.parse(text) as RawMaterialResult;
  const validated = validateMaterial(parsed);
  const usage = result.response.usageMetadata;

  const terms: Term[] = validated.terms.map((t) => ({
    termId: t.termId,
    surface: t.surface,
    reading: t.reading,
    definition: t.definition,
    category: t.category as Term["category"],
    confidence: t.confidence,
  }));

  let mentions: Mention[] = validated.mentions;
  mentions = correctMentionOffsets(assistantContent, mentions);
  mentions = deduplicateMentions(mentions);

  return {
    summary: validated.summary,
    terms,
    mentions,
    promptTokens: usage?.promptTokenCount || 0,
    completionTokens: usage?.candidatesTokenCount || 0,
  };
}

async function generateText(
  prompt: string,
  assistantContent: string
): Promise<MaterialGenerationResult> {
  const model = vertexAI.getGenerativeModel({
    model: "gemini-2.0-flash-001",
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  // マークダウンのコードブロックを除去
  const cleaned = text
    .replace(/^```json?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const parsed = JSON.parse(cleaned) as RawMaterialResult;
  const validated = validateMaterial(parsed);
  const usage = result.response.usageMetadata;

  const terms: Term[] = validated.terms.map((t) => ({
    termId: t.termId,
    surface: t.surface,
    reading: t.reading,
    definition: t.definition,
    category: t.category as Term["category"],
    confidence: t.confidence,
  }));

  let mentions: Mention[] = validated.mentions;
  mentions = correctMentionOffsets(assistantContent, mentions);
  mentions = deduplicateMentions(mentions);

  return {
    summary: validated.summary,
    terms,
    mentions,
    promptTokens: usage?.promptTokenCount || 0,
    completionTokens: usage?.candidatesTokenCount || 0,
  };
}
