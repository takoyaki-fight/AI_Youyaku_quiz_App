"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { MessageList } from "@/components/chat/MessageList";
import type { MessageItem } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { apiGet, apiPost } from "@/lib/api-client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

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
  material?: MaterialData | null;
}

const MATERIAL_POLL_INTERVAL_MS = 1200;
const MATERIAL_POLL_MAX_ATTEMPTS = 12;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ChatPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [sending, setSending] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const mountedRef = useRef(true);
  const conversationIdRef = useRef(conversationId);
  const pollingKeysRef = useRef<Set<string>>(new Set());
  const polledKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    conversationIdRef.current = conversationId;
    pollingKeysRef.current.clear();
    polledKeysRef.current.clear();
  }, [conversationId]);

  const pollAndAttachMaterial = useCallback(
    async (messageId: string) => {
      const targetConversationId = conversationId;
      const key = `${targetConversationId}:${messageId}`;

      if (
        pollingKeysRef.current.has(key) ||
        polledKeysRef.current.has(key)
      ) {
        return;
      }

      pollingKeysRef.current.add(key);
      try {
        for (let i = 0; i < MATERIAL_POLL_MAX_ATTEMPTS; i++) {
          try {
            const matData = await apiGet<{ material: MaterialData }>(
              `/api/v1/conversations/${targetConversationId}/materials/${messageId}`
            );

            if (
              !mountedRef.current ||
              conversationIdRef.current !== targetConversationId
            ) {
              return;
            }

            setMessages((prev) =>
              prev.map((msg) =>
                msg.messageId === messageId
                  ? { ...msg, material: matData.material }
                  : msg
              )
            );
            return;
          } catch {
            // Material may still be generating; retry shortly.
          }

          await sleep(MATERIAL_POLL_INTERVAL_MS);
        }
      } finally {
        pollingKeysRef.current.delete(key);
        polledKeysRef.current.add(key);
      }
    },
    [conversationId]
  );

  useEffect(() => {
    setPageLoading(true);
    apiGet<ConversationDetail>(`/api/v1/conversations/${conversationId}`)
      .then(async (data) => {
        const msgsWithMaterials: MessageItem[] = await Promise.all(
          data.messages.map(async (msg) => {
            if (msg.role === "assistant") {
              try {
                const matData = await apiGet<{ material: MaterialData }>(
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

        if (!mountedRef.current || conversationIdRef.current !== conversationId) {
          return;
        }

        setMessages(msgsWithMaterials);
      })
      .catch(() => {
        toast.error("Failed to load conversation");
      })
      .finally(() => {
        if (mountedRef.current && conversationIdRef.current === conversationId) {
          setPageLoading(false);
        }
      });
  }, [conversationId]);

  useEffect(() => {
    for (const message of messages) {
      if (message.role === "assistant" && !message.material) {
        void pollAndAttachMaterial(message.messageId);
      }
    }
  }, [messages, pollAndAttachMaterial]);

  const handleSend = useCallback(
    async (content: string) => {
      if (sending) return;
      setSending(true);

      const tempUserMsg: MessageItem = {
        messageId: `temp-${Date.now()}`,
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

        const assistantWithMaterial: MessageItem = {
          ...result.assistantMessage,
          material: result.material || null,
        };

        setMessages((prev) => [
          ...prev.filter((m) => m.messageId !== tempUserMsg.messageId),
          result.userMessage,
          assistantWithMaterial,
        ]);
        window.dispatchEvent(new Event("conversations:refresh"));
      } catch {
        toast.error("Failed to send message");
        setMessages((prev) =>
          prev.filter((m) => m.messageId !== tempUserMsg.messageId)
        );
      } finally {
        if (mountedRef.current) {
          setSending(false);
        }
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ChatHeader />
      <MessageList messages={messages} loading={sending} />
      <MessageInput onSend={handleSend} disabled={sending} />
    </div>
  );
}
