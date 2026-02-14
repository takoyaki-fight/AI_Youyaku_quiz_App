"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiGet, apiPost } from "@/lib/api-client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { Plus, MessageCircle, Loader2 } from "lucide-react";

interface ConversationItem {
  conversationId: string;
  title: string;
  messageCount: number;
  updatedAt: { _seconds: number };
}

export function ConversationSidebar() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const params = useParams();
  const currentId = params.conversationId as string | undefined;

  const fetchConversations = useCallback(async () => {
    try {
      const data = await apiGet<{ conversations: ConversationItem[] }>(
        "/api/v1/conversations"
      );
      setConversations(data.conversations);
    } catch {
      toast.error("会話一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    const onRefresh = () => {
      void fetchConversations();
    };

    window.addEventListener("conversations:refresh", onRefresh);
    return () => {
      window.removeEventListener("conversations:refresh", onRefresh);
    };
  }, [fetchConversations]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const conv = await apiPost<ConversationItem>(
        "/api/v1/conversations",
        { title: "新しい会話" },
        uuidv4()
      );
      setConversations((prev) => [conv, ...prev]);
      router.push(`/chat/${conv.conversationId}`);
    } catch {
      toast.error("会話の作成に失敗しました");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="hidden h-full min-h-0 w-64 flex-col overflow-hidden border-r bg-gray-50/50 md:flex">
      <div className="p-3 border-b bg-white/50">
        <Button
          onClick={handleCreate}
          disabled={creating}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm"
          size="sm"
        >
          {creating ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-1.5" />
          )}
          {creating ? "作成中..." : "新しい会話"}
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {loading ? (
          <div className="p-6 flex flex-col items-center gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs">読み込み中...</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-6 flex flex-col items-center gap-2 text-gray-400">
            <MessageCircle className="w-8 h-8 stroke-1" />
            <span className="text-xs">会話がありません</span>
          </div>
        ) : (
          <div className="py-1.5 px-2">
            {conversations.map((conv) => {
              const isActive = currentId === conv.conversationId;
              return (
                <button
                  key={conv.conversationId}
                  onClick={() => router.push(`/chat/${conv.conversationId}`)}
                  className={`w-full text-left px-3 py-2.5 text-sm rounded-lg mb-0.5 transition-all ${
                    isActive
                      ? "bg-white font-medium shadow-sm border border-gray-200/80 text-gray-900"
                      : "text-gray-600 hover:bg-white/80 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageCircle className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-blue-600" : "text-gray-400"}`} />
                    <span className="min-w-0 break-words whitespace-normal leading-snug">
                      {conv.title}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
