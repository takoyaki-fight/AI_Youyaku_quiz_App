import { SchemaType } from "@google-cloud/vertexai";

export function buildDailyQuizPrompt(
  conversationsWithMessages: string,
  allocatedCount: number
): string {
  return `あなたは学習確認のための一問一答を生成するAIです。

## 昨日の会話内容
${conversationsWithMessages}

## 生成指示

以下のJSON形式で一問一答カードを${allocatedCount}問生成してください。

{
  "cards": [
    {
      "tag": "What | Why | How | When | Example",
      "question": "問題文（日本語）",
      "answer": "回答（日本語、2〜5文）",
      "sourceMessageIds": ["msg_xxx"],
      "conversationId": "conv_xxx"
    }
  ]
}

## ルール
1. タグの分類:
   - What: 定義・概念の確認（「〜とは何ですか？」）
   - Why: 理由・目的の確認（「なぜ〜ですか？」）
   - How: 手順・方法の確認（「どのように〜しますか？」）
   - When: 条件・タイミングの確認（「どのような場合に〜しますか？」）
   - Example: 具体例の確認（「〜の具体例を挙げてください」）
2. 各タグが偏らないよう、バランスよく生成すること。
3. sourceMessageIdsには、その問題の根拠となるassistantメッセージのIDを含める。
4. この会話から生成する問題数: ${allocatedCount}問
5. 問題の難易度は会話内容に基づき、初学者でも取り組めるレベルにする。
6. 出力はJSONのみ。`;
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
          answer: { type: SchemaType.STRING },
          sourceMessageIds: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          conversationId: { type: SchemaType.STRING },
        },
        required: [
          "tag",
          "question",
          "answer",
          "sourceMessageIds",
          "conversationId",
        ],
      },
    },
  },
  required: ["cards"],
};
