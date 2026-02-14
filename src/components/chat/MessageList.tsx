"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot } from "lucide-react";

interface MaterialData {
  summary: string[];
  terms: Array<{
    termId: string;
    surface: string;
    reading: string;
    definition: string;
    category: string;
  }>;
  mentions: Array<{
    termId: string;
    surface: string;
    startOffset: number;
    endOffset: number;
  }>;
}

export interface MessageItem {
  messageId: string;
  role: "user" | "assistant";
  content: string;
  material?: MaterialData | null;
}

interface MessageListProps {
  messages: MessageItem[];
  loading?: boolean;
}

export function MessageList({ messages, loading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <ScrollArea className="min-h-0 flex-1 px-4 py-4 md:px-6">
      <div className="mx-auto w-full max-w-4xl">
        {messages.length === 0 && !loading && (
          <div className="mb-5 mt-3 flex justify-start gap-2.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--md-sys-color-primary-container)] text-[color:var(--md-sys-color-on-primary-container)]">
              <Bot className="h-4 w-4" />
            </div>
            <div className="max-w-[min(42rem,100%)] rounded-[var(--md-shape-lg)] border border-border/70 bg-[color:var(--md-sys-color-surface-container)] px-4 py-3 shadow-[var(--md-elevation-1)]">
              <p className="text-sm font-medium text-foreground">
                学習したい内容を入力してください
              </p>
              <p className="mt-1 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                AIが要点整理と用語チェックを行います
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-[color:var(--md-sys-color-secondary-container)] px-2 py-0.5 text-[10px] text-[color:var(--md-sys-color-on-secondary-container)]">
                  例: 線形代数の基礎
                </span>
                <span className="rounded-full bg-[color:var(--md-sys-color-tertiary-container)] px-2 py-0.5 text-[10px] text-[color:var(--md-sys-color-on-tertiary-container)]">
                  例: 微分の考え方
                </span>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.messageId}
            role={msg.role}
            content={msg.content}
            material={msg.material}
          />
        ))}

        {loading && (
          <div className="mb-5 flex justify-start gap-2.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--md-sys-color-primary-container)] text-[color:var(--md-sys-color-on-primary-container)]">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-[var(--md-shape-lg)] border border-border/70 bg-card px-4 py-3 shadow-[var(--md-elevation-1)]">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 animate-bounce rounded-full bg-[color:var(--md-sys-color-primary)]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[color:var(--md-sys-color-primary)] [animation-delay:0.12s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[color:var(--md-sys-color-primary)] [animation-delay:0.24s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
