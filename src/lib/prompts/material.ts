export function buildMaterialPrompt(
  conversationHistory: string,
  assistantMessage: string
): string {
  return `あなたは学習支援のための素材生成AIです。
以下のassistantの応答に対して、学習素材を生成してください。

## 会話コンテキスト
${conversationHistory}

## 対象のassistant応答
${assistantMessage}

## 生成指示

以下のJSON形式で出力してください。JSON以外のテキストは一切出力しないでください。

{
  "summary": [
    "要約文1",
    "要約文2"
  ],
  "terms": [
    {
      "termId": "term_001",
      "surface": "用語の表層形",
      "reading": "よみがな（ひらがな）",
      "definition": "この会話文脈における用語の意味",
      "category": "technical | proper_noun | concept",
      "confidence": 0.0〜1.0
    }
  ],
  "mentions": [
    {
      "termId": "対応するtermのtermId",
      "surface": "本文中に出現した表記そのもの",
      "startOffset": 0,
      "endOffset": 0,
      "confidence": 0.0〜1.0
    }
  ]
}

## ルール
1. summary: 5〜10行。この応答の理解を助ける要約。箇条書きの各項目は1文で簡潔に。
2. terms: 専門用語・固有名詞を抽出。一般的すぎる語（「技術」「方法」等）は除外。confidence 0.7未満は除外。
3. mentions: assistant応答本文中の用語出現位置を正確に特定。
   - startOffset/endOffset は本文の文字数カウントで正確に算出すること。
   - 同じ用語が複数回出現する場合、各出現を別々のmentionとして記録。
   - confidence 0.7未満のmentionは除外。
   - 部分一致や曖昧な一致は低いconfidenceにする。
4. 出力はJSONのみ。マークダウンのコードブロック記法は使わない。`;
}

import { SchemaType } from "@google-cloud/vertexai";

export const MATERIAL_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    summary: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    terms: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          termId: { type: SchemaType.STRING },
          surface: { type: SchemaType.STRING },
          reading: { type: SchemaType.STRING },
          definition: { type: SchemaType.STRING },
          category: {
            type: SchemaType.STRING,
            enum: ["technical", "proper_noun", "concept"],
          },
          confidence: { type: SchemaType.NUMBER },
        },
        required: [
          "termId",
          "surface",
          "reading",
          "definition",
          "category",
          "confidence",
        ],
      },
    },
    mentions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          termId: { type: SchemaType.STRING },
          surface: { type: SchemaType.STRING },
          startOffset: { type: SchemaType.INTEGER },
          endOffset: { type: SchemaType.INTEGER },
          confidence: { type: SchemaType.NUMBER },
        },
        required: [
          "termId",
          "surface",
          "startOffset",
          "endOffset",
          "confidence",
        ],
      },
    },
  },
  required: ["summary", "terms", "mentions"],
};
