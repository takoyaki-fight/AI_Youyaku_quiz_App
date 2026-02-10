"use client";

import { LinkedContent } from "./LinkedContent";
import { SummaryAccordion } from "./SummaryAccordion";

interface TermInfo {
  termId: string;
  surface: string;
  reading: string;
  definition: string;
  category: string;
}

interface MentionInfo {
  termId: string;
  surface: string;
  startOffset: number;
  endOffset: number;
}

interface MaterialData {
  summary: string[];
  terms: TermInfo[];
  mentions: MentionInfo[];
}

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  material?: MaterialData | null;
}

export function MessageBubble({ role, content, material }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-white border border-gray-200 text-gray-900"
        }`}
      >
        <div className="text-sm leading-relaxed">
          {isUser || !material?.mentions?.length ? (
            <span className="whitespace-pre-wrap">{content}</span>
          ) : (
            <LinkedContent
              content={content}
              mentions={material.mentions}
              terms={material.terms}
            />
          )}
        </div>
        {!isUser && material?.summary && material.summary.length > 0 && (
          <SummaryAccordion summary={material.summary} />
        )}
      </div>
    </div>
  );
}
