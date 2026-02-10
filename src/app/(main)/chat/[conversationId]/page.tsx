"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { MessageList } from "@/components/chat/MessageList";
import type { MessageItem } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { apiGet, apiPost } from "@/lib/api-client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

interface ConversationDetail {
  conversation: { title: string; conversationId: string };
  messages: Array<{
    messageId: string;
    role: "user" | "assistant";
    content: string;
  }>;
}

interface SendResult {
  userMessage: MessageItem;
  assistantMessage: MessageItem;
  material?: {
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
  } | null;
}

export default function ChatPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [sending, setSending] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // 会話読み込み時に既存メッセージの素材も取得
  useEffect(() => {
    setPageLoading(true);
    apiGet<ConversationDetail>(`/api/v1/conversations/${conversationId}`)
      .then(async (data) => {
        // assistant メッセージの素材を並列取得
        const msgsWithMaterials: MessageItem[] = await Promise.all(
          data.messages.map(async (msg) => {
            if (msg.role === "assistant") {
              try {
                const matData = await apiGet<{
                  material: {
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
                  };
                }>(
                  `/api/v1/conversations/${conversationId}/materials/${msg.messageId}`
                );
                return { ...msg, material: matData.material };
              } catch {
                return { ...msg, material: null };
              }
            }
            return msg;
          })
        );
        setMessages(msgsWithMaterials);
      })
      .catch(() => {
        toast.error("会話の読み込みに失敗しました");
      })
      .finally(() => {
        setPageLoading(false);
      });
  }, [conversationId]);

  const handleSend = useCallback(
    async (content: string) => {
      if (sending) return;
      setSending(true);

      const tempUserMsg: MessageItem = {
        messageId: "temp-" + Date.now(),
        role: "user",
        content,
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      try {
        const result = await apiPost<SendResult>(
          `/api/v1/conversations/${conversationId}/messages`,
          { content },
          uuidv4()
        );

        // assistantメッセージにmaterialを付与
        const assistantWithMaterial: MessageItem = {
          ...result.assistantMessage,
          material: result.material || null,
        };

        setMessages((prev) => [
          ...prev.filter((m) => m.messageId !== tempUserMsg.messageId),
          result.userMessage,
          assistantWithMaterial,
        ]);
      } catch {
        toast.error("メッセージの送信に失敗しました");
        setMessages((prev) =>
          prev.filter((m) => m.messageId !== tempUserMsg.messageId)
        );
      } finally {
        setSending(false);
      }
    },
    [conversationId, sending]
  );

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <>
      <ChatHeader />
      <MessageList messages={messages} loading={sending} />
      <MessageInput onSend={handleSend} disabled={sending} />
    </>
  );
}
