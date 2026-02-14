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
  choices: string[];
  answer: string;
  explanation: string;
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
    .map((card) => {
      const question =
        typeof card.question === "string" ? card.question.trim() : "";
      const explanation =
        typeof card.explanation === "string" ? card.explanation.trim() : "";
      const answer = typeof card.answer === "string" ? card.answer.trim() : "";
      const choices = Array.isArray(card.choices)
        ? card.choices
            .map((choice) => (typeof choice === "string" ? choice.trim() : ""))
            .filter((choice) => choice.length > 0)
        : [];

      if (!validTags.has(card.tag)) return null;
      if (question.length === 0 || explanation.length === 0 || answer.length === 0) {
        return null;
      }
      if (choices.length !== 4) return null;
      if (new Set(choices).size !== 4) return null;

      const correctIndex = choices.findIndex((choice) => choice === answer);
      if (correctIndex < 0) return null;

      const sources = Array.isArray(card.sourceMessageIds)
        ? card.sourceMessageIds.filter(
            (id): id is string => typeof id === "string" && id.length > 0
          )
        : [];

      return {
        cardId: uuidv4(),
        tag: card.tag as QuizCard["tag"],
        question,
        choices,
        correctIndex,
        answer,
        explanation,
        sources,
        conversationId:
          typeof card.conversationId === "string" ? card.conversationId : "",
      } satisfies QuizCard;
    })
    .filter((card): card is QuizCard => card !== null);
}
