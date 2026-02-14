import { VertexAI, type GenerativeModel } from "@google-cloud/vertexai";

let vertexAIInstance: VertexAI | null = null;
let chatModelInstance: GenerativeModel | null = null;
let structuredModelInstance: GenerativeModel | null = null;

const DEFAULT_LOCATION = "asia-northeast1";
export const MODEL_NAME = process.env.VERTEX_AI_MODEL || "gemini-2.5-flash";

function getProjectId(): string {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    throw new Error("GOOGLE_CLOUD_PROJECT is not set");
  }
  return projectId;
}

export function getVertexAI(): VertexAI {
  if (!vertexAIInstance) {
    vertexAIInstance = new VertexAI({
      project: getProjectId(),
      location: process.env.VERTEX_AI_LOCATION || DEFAULT_LOCATION,
    });
  }

  return vertexAIInstance;
}

export function getChatModel(): GenerativeModel {
  if (!chatModelInstance) {
    chatModelInstance = getVertexAI().getGenerativeModel({
      model: MODEL_NAME,
    });
  }

  return chatModelInstance;
}

export function getStructuredModel(): GenerativeModel {
  if (!structuredModelInstance) {
    structuredModelInstance = getVertexAI().getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
  }

  return structuredModelInstance;
}
