import { Timestamp } from "firebase-admin/firestore";

export interface Term {
  termId: string;
  surface: string;
  reading: string;
  definition: string;
  category: "technical" | "proper_noun" | "concept";
  confidence: number;
}

export interface Mention {
  termId: string;
  surface: string;
  startOffset: number;
  endOffset: number;
  confidence: number;
}

export interface Material {
  materialId: string;
  messageId: string;
  version: number;
  isActive: boolean;
  summary: string[];
  terms: Term[];
  mentions: Mention[];
  idempotencyKey: string;
  generationModel: string;
  promptTokens: number;
  completionTokens: number;
  generatedAt: Timestamp;
  expireAt: Timestamp;
}
