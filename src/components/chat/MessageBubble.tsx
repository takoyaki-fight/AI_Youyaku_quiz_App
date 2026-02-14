"use client";

import { SummaryAccordion } from "./SummaryAccordion";
import { MarkdownContent } from "./MarkdownContent";
import { Bot, User } from "lucide-react";

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
    <div className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"} mb-5`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-sm shadow-blue-200"
            : "bg-white border border-gray-100 text-gray-900 shadow-sm"
        }`}
      >
        <div>
          <MarkdownContent
            content={content}
            isUser={isUser}
            mentions={!isUser ? material?.mentions ?? [] : []}
            terms={!isUser ? material?.terms ?? [] : []}
          />
        </div>
        {!isUser && material?.summary && material.summary.length > 0 && (
          <SummaryAccordion summary={material.summary} />
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
}
