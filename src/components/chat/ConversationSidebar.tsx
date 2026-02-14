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
    <aside className="hidden h-full min-h-0 w-72 flex-col overflow-hidden border-r border-border/70 bg-[color:var(--md-sys-color-surface-container-low)] md:flex">
      <div className="space-y-3 border-b border-border/70 p-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">会話</h2>
          <p className="text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
            学習テーマごとに会話を整理できます
          </p>
        </div>
        <Button onClick={handleCreate} disabled={creating} className="w-full">
          {creating ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-1.5 h-4 w-4" />
          )}
          {creating ? "作成中..." : "新しい会話"}
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-2 py-3">
        {loading ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-[color:var(--md-sys-color-on-surface-variant)]">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-xs">読み込み中...</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-[color:var(--md-sys-color-on-surface-variant)]">
            <MessageCircle className="h-8 w-8 stroke-1" />
            <span className="text-xs">会話がまだありません</span>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => {
              const isActive = currentId === conv.conversationId;
              return (
                <button
                  key={conv.conversationId}
                  onClick={() => router.push(`/chat/${conv.conversationId}`)}
                  className={`w-full rounded-[var(--md-shape-md)] px-3 py-2.5 text-left text-sm transition-colors ${
                    isActive
                      ? "border border-border/70 bg-[color:var(--md-sys-color-secondary-container)] text-[color:var(--md-sys-color-on-secondary-container)] shadow-[var(--md-elevation-1)]"
                      : "text-[color:var(--md-sys-color-on-surface-variant)] hover:bg-[color:var(--md-sys-color-surface-container)] hover:text-foreground"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <MessageCircle
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        isActive
                          ? "text-[color:var(--md-sys-color-on-secondary-container)]"
                          : "text-[color:var(--md-sys-color-outline)]"
                      }`}
                    />
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
    </aside>
  );
}
