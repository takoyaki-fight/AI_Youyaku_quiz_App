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
    <ScrollArea className="flex-1 p-4">
      <div className="max-w-4xl mx-auto">
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
          <div className="flex gap-2.5 justify-start mb-5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
