import { SchemaType } from "@google-cloud/vertexai";

export function buildDailyQuizPrompt(
  conversationsWithMessages: string,
  allocatedCount: number
): string {
  return `You are an assistant that creates a daily multiple-choice quiz from chat logs.

## Conversation Data
${conversationsWithMessages}

## Task
Generate exactly ${allocatedCount} quiz cards in JSON format.
Each card must be a 4-choice question with one correct answer and a short explanation.

## Output Format
Return JSON only:
{
  "cards": [
    {
      "tag": "What | Why | How | When | Example",
      "question": "Question text",
      "choices": ["choice A", "choice B", "choice C", "choice D"],
      "answer": "one of the 4 choices exactly",
      "explanation": "Why this answer is correct",
      "sourceMessageIds": ["msg_xxx"],
      "conversationId": "conv_xxx"
    }
  ]
}

## Rules
1. Make all content in Japanese.
2. choices must contain exactly 4 distinct options.
3. answer must exactly match one item in choices.
4. explanation should be concise and useful (1-3 sentences).
5. sourceMessageIds must include assistant message IDs from the provided logs.
6. conversationId must match the source conversation.
7. Generate exactly ${allocatedCount} cards.
8. Return JSON only.`;
}

export const DAILY_QUIZ_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    cards: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          tag: {
            type: SchemaType.STRING,
            enum: ["What", "Why", "How", "When", "Example"],
          },
          question: { type: SchemaType.STRING },
          choices: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          answer: { type: SchemaType.STRING },
          explanation: { type: SchemaType.STRING },
          sourceMessageIds: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          conversationId: { type: SchemaType.STRING },
        },
        required: [
          "tag",
          "question",
          "choices",
          "answer",
          "explanation",
          "sourceMessageIds",
          "conversationId",
        ],
      },
    },
  },
  required: ["cards"],
};
