import { Timestamp } from "firebase-admin/firestore";

export interface QuizCard {
  cardId: string;
  tag: "What" | "Why" | "How" | "When" | "Example";
  question: string;
  answer: string;
  sources: string[];
  conversationId: string;
}

export interface DailyQuiz {
  quizId: string;
  targetDate: string;
  version: number;
  isActive: boolean;
  cards: QuizCard[];
  idempotencyKey: string;
  generationModel: string;
  promptTokens: number;
  completionTokens: number;
  generatedAt: Timestamp;
  expireAt: Timestamp;
}
