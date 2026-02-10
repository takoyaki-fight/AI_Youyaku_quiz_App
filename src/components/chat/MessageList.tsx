"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    <ScrollArea className="flex-1 p-4">
      {messages.length === 0 && !loading && (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          メッセージを送信して会話を始めましょう
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
        <div className="flex justify-start mb-4">
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.15s]" />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.3s]" />
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </ScrollArea>
  );
}
