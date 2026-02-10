import { VertexAI } from "@google-cloud/vertexai";

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT!,
  location: process.env.VERTEX_AI_LOCATION || "asia-northeast1",
});

export const chatModel = vertexAI.getGenerativeModel({
  model: "gemini-2.0-flash-001",
});

export const structuredModel = vertexAI.getGenerativeModel({
  model: "gemini-2.0-flash-001",
  generationConfig: {
    responseMimeType: "application/json",
  },
});

export { vertexAI };
