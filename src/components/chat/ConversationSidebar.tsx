"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiGet, apiPost } from "@/lib/api-client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

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

  const fetchConversations = async () => {
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
  };

  useEffect(() => {
    fetchConversations();
  }, []);

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
    <div className="w-64 border-r bg-white flex flex-col h-full">
      <div className="p-3 border-b">
        <Button
          onClick={handleCreate}
          disabled={creating}
          className="w-full"
          size="sm"
        >
          {creating ? "作成中..." : "+ 新しい会話"}
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 text-center text-sm text-gray-400">
            読み込み中...
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-400">
            会話がありません
          </div>
        ) : (
          <div className="py-1">
            {conversations.map((conv) => (
              <button
                key={conv.conversationId}
                onClick={() => router.push(`/chat/${conv.conversationId}`)}
                className={`w-full text-left px-3 py-2 text-sm truncate transition-colors ${
                  currentId === conv.conversationId
                    ? "bg-gray-100 font-medium"
                    : "hover:bg-gray-50"
                }`}
              >
                {conv.title}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
