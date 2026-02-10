import {
  saveMaterial,
  getActiveMaterial,
  getMaterialVersions,
  saveGenerationLog,
} from "@/lib/firestore/repository";
import { generateMaterial } from "@/lib/vertex-ai/material";
import type { Message } from "@/types/message";
import type { Material } from "@/types/material";
import { Timestamp } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";

export async function generateAndSaveMaterial(
  userId: string,
  conversationId: string,
  assistantMessageId: string,
  assistantContent: string,
  history: Message[],
  conversationExpireAt: Timestamp,
  version = 1
): Promise<Material> {
  const startTime = Date.now();

  const result = await generateMaterial(history, assistantContent);

  const materialId = `${assistantMessageId}_v${version}`;
  const material: Material = {
    materialId,
    messageId: assistantMessageId,
    version,
    isActive: true,
    summary: result.summary,
    terms: result.terms,
    mentions: result.mentions,
    idempotencyKey: materialId,
    generationModel: "gemini-2.0-flash-001",
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    generatedAt: Timestamp.now(),
    expireAt: conversationExpireAt,
  };

  await saveMaterial(userId, conversationId, material);

  // GenerationLog
  await saveGenerationLog(userId, {
    logId: uuidv4(),
    type: "material",
    model: "gemini-2.0-flash-001",
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    totalTokens: result.promptTokens + result.completionTokens,
    latencyMs: Date.now() - startTime,
    success: true,
  });

  return material;
}

export { getActiveMaterial, getMaterialVersions };
