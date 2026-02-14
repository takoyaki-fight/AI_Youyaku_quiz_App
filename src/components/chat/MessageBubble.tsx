"use client";

import { useCallback, useState } from "react";
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

interface FollowupTurn {
  question: string;
  answer: string;
}

export function MessageBubble({ role, content, material }: MessageBubbleProps) {
  const isUser = role === "user";
  const [termFollowupTurns, setTermFollowupTurns] = useState<
    Record<string, FollowupTurn[]>
  >({});

  const handleAppendTermFollowupTurn = useCallback(
    (termKey: string, turn: FollowupTurn) => {
      setTermFollowupTurns((prev) => ({
        ...prev,
        [termKey]: [...(prev[termKey] ?? []), turn],
      }));
    },
    []
  );

  return (
    <div className={`mb-5 flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--md-sys-color-primary-container)] text-[color:var(--md-sys-color-on-primary-container)]">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div
        className={`max-w-[78%] rounded-[var(--md-shape-lg)] border px-4 py-3 shadow-[var(--md-elevation-1)] ${
          isUser
            ? "border-[color:color-mix(in_srgb,var(--md-sys-color-primary),transparent_68%)] bg-[color:var(--md-sys-color-primary-container)] text-[color:var(--md-sys-color-on-primary-container)]"
            : "border-border/70 bg-card text-foreground"
        }`}
      >
        <MarkdownContent
          content={content}
          isUser={isUser}
          mentions={!isUser ? material?.mentions ?? [] : []}
          terms={!isUser ? material?.terms ?? [] : []}
          termFollowupTurns={termFollowupTurns}
          onAppendTermFollowupTurn={handleAppendTermFollowupTurn}
        />
        {!isUser && material?.summary && material.summary.length > 0 && (
          <SummaryAccordion summary={material.summary} />
        )}
      </div>

      {isUser && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--md-sys-color-secondary-container)] text-[color:var(--md-sys-color-on-secondary-container)]">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
