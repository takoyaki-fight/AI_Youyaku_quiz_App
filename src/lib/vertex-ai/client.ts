import { VertexAI } from "@google-cloud/vertexai";

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT!,
  location: process.env.VERTEX_AI_LOCATION || "asia-northeast1",
});

export const MODEL_NAME = process.env.VERTEX_AI_MODEL || "gemini-2.5-flash";

export const chatModel = vertexAI.getGenerativeModel({
  model: MODEL_NAME,
});

export const structuredModel = vertexAI.getGenerativeModel({
  model: MODEL_NAME,
  generationConfig: {
    responseMimeType: "application/json",
  },
});

export { vertexAI };
