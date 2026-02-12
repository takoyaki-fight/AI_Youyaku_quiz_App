import { vertexAI, MODEL_NAME } from "./client";
import {
  buildDailyQuizPrompt,
  DAILY_QUIZ_RESPONSE_SCHEMA,
} from "@/lib/prompts/daily-quiz";
import type { QuizCard } from "@/types/daily-quiz";
import { v4 as uuidv4 } from "uuid";

interface RawCard {
  tag: string;
  question: string;
  answer: string;
  sourceMessageIds: string[];
  conversationId: string;
}

export interface QuizGenerationResult {
  cards: QuizCard[];
  promptTokens: number;
  completionTokens: number;
}

export async function generateDailyQuizCards(
  conversationsText: string,
  allocatedCount: number
): Promise<QuizGenerationResult> {
  const prompt = buildDailyQuizPrompt(conversationsText, allocatedCount);

  try {
    return await generateStructured(prompt);
  } catch (e) {
    console.warn("Structured quiz generation failed, trying text:", e);
    try {
      return await generateText(prompt);
    } catch (e2) {
      console.error("Text quiz generation also failed:", e2);
      return { cards: [], promptTokens: 0, completionTokens: 0 };
    }
  }
}

async function generateStructured(
  prompt: string
): Promise<QuizGenerationResult> {
  const model = vertexAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: DAILY_QUIZ_RESPONSE_SCHEMA,
    },
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const text =
    result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const parsed = JSON.parse(text) as { cards: RawCard[] };
  const usage = result.response.usageMetadata;

  return {
    cards: validateCards(parsed.cards),
    promptTokens: usage?.promptTokenCount || 0,
    completionTokens: usage?.candidatesTokenCount || 0,
  };
}

async function generateText(prompt: string): Promise<QuizGenerationResult> {
  const model = vertexAI.getGenerativeModel({
    model: MODEL_NAME,
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const text =
    result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const cleaned = text
    .replace(/^```json?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const parsed = JSON.parse(cleaned) as { cards: RawCard[] };
  const usage = result.response.usageMetadata;

  return {
    cards: validateCards(parsed.cards),
    promptTokens: usage?.promptTokenCount || 0,
    completionTokens: usage?.candidatesTokenCount || 0,
  };
}

function validateCards(raw: RawCard[]): QuizCard[] {
  if (!Array.isArray(raw)) return [];

  const validTags = new Set(["What", "Why", "How", "When", "Example"]);

  return raw
    .filter(
      (c) =>
        validTags.has(c.tag) &&
        c.question?.length > 0 &&
        c.answer?.length > 0
    )
    .map((c) => ({
      cardId: uuidv4(),
      tag: c.tag as QuizCard["tag"],
      question: c.question,
      answer: c.answer,
      sources: c.sourceMessageIds || [],
      conversationId: c.conversationId || "",
    }));
}
