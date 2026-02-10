import { Timestamp } from "firebase-admin/firestore";

export interface GenerationLog {
  logId: string;
  type: "chat" | "material" | "daily_quiz" | "regeneration";
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  createdAt: Timestamp;
  expireAt: Timestamp;
}
