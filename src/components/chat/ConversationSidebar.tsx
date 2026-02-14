"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import {
  EllipsisVertical,
  Loader2,
  MessageCircle,
  PencilLine,
  Plus,
  Trash2,
} from "lucide-react";

interface FirestoreTimestamp {
  _seconds?: number;
  seconds?: number;
  _nanoseconds?: number;
  nanoseconds?: number;
}

interface ConversationItem {
  conversationId: string;
  title: string;
  messageCount: number;
  updatedAt?: FirestoreTimestamp | null;
}

const absoluteFormatter = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function toDate(timestamp?: FirestoreTimestamp | null): Date | null {
  if (!timestamp) return null;

  const seconds =
    typeof timestamp._seconds === "number"
      ? timestamp._seconds
      : typeof timestamp.seconds === "number"
        ? timestamp.seconds
        : null;

  const nanoseconds =
    typeof timestamp._nanoseconds === "number"
      ? timestamp._nanoseconds
      : typeof timestamp.nanoseconds === "number"
        ? timestamp.nanoseconds
        : 0;

  if (seconds === null) return null;
  return new Date(seconds * 1000 + Math.floor(nanoseconds / 1_000_000));
}

function formatTimestampLabel(timestamp?: FirestoreTimestamp | null): string {
  const date = toDate(timestamp);
  if (!date) return "日時不明";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const absolute = absoluteFormatter.format(date);

  if (diffMinutes < 1) {
    return "たった今";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}分前`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}時間前`;
  }

  return absolute;
}

export function ConversationSidebar() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
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

  const handleRename = useCallback(
    async (conv: ConversationItem) => {
      setOpenMenuId(null);

      const rawTitle = window.prompt("新しいチャット名を入力してください", conv.title);
      if (rawTitle === null) return;

      const title = rawTitle.trim();
      if (!title) {
        toast.error("チャット名を入力してください");
        return;
      }

      if (title === conv.title) return;

      setProcessingId(conv.conversationId);
      try {
        await apiPatch(`/api/v1/conversations/${conv.conversationId}`, { title });
        toast.success("チャット名を変更しました");
        await fetchConversations();
        window.dispatchEvent(new Event("conversations:refresh"));
      } catch {
        toast.error("チャット名の変更に失敗しました");
      } finally {
        setProcessingId((prev) =>
          prev === conv.conversationId ? null : prev
        );
      }
    },
    [fetchConversations]
  );

  const handleDelete = useCallback(
    async (conv: ConversationItem) => {
      setOpenMenuId(null);

      const ok = window.confirm("このチャットを削除しますか？この操作は取り消せません。");
      if (!ok) return;

      setProcessingId(conv.conversationId);
      try {
        await apiDelete(`/api/v1/conversations/${conv.conversationId}`);
        setConversations((prev) =>
          prev.filter((item) => item.conversationId !== conv.conversationId)
        );

        if (currentId === conv.conversationId) {
          router.push("/chat");
        }

        toast.success("チャットを削除しました");
        window.dispatchEvent(new Event("conversations:refresh"));
      } catch {
        toast.error("チャットの削除に失敗しました");
      } finally {
        setProcessingId((prev) =>
          prev === conv.conversationId ? null : prev
        );
      }
    },
    [currentId, router]
  );

  return (
    <aside className="hidden h-full min-h-0 w-72 flex-col overflow-hidden border-r border-border/70 bg-[color:var(--md-sys-color-surface-container-low)] md:flex">
      <div className="space-y-3 border-b border-border/70 p-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">チャット</h2>
          <p className="text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
            学習テーマごとに会話を分けて管理できます
          </p>
        </div>
        <Button onClick={handleCreate} disabled={creating} className="relative w-full justify-center">
          {creating ? (
            <Loader2 className="absolute left-5 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="absolute left-5 h-4 w-4" />
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
              const isProcessing = processingId === conv.conversationId;

              return (
                <div
                  key={conv.conversationId}
                  className={`group flex items-start gap-1 rounded-[var(--md-shape-md)] border transition-colors ${
                    isActive
                      ? "border-border/70 bg-[color:var(--md-sys-color-secondary-container)] text-[color:var(--md-sys-color-on-secondary-container)] shadow-[var(--md-elevation-1)]"
                      : "border-transparent text-[color:var(--md-sys-color-on-surface-variant)] hover:bg-[color:var(--md-sys-color-surface-container)] hover:text-foreground"
                  }`}
                >
                  <button
                    onClick={() => router.push(`/chat/${conv.conversationId}`)}
                    className="min-w-0 flex-1 rounded-[inherit] px-3 py-2.5 text-left"
                    disabled={isProcessing}
                  >
                    <div className="flex items-start gap-2">
                      <MessageCircle
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          isActive
                            ? "text-[color:var(--md-sys-color-on-secondary-container)]"
                            : "text-[color:var(--md-sys-color-outline)]"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="break-words whitespace-normal text-sm leading-snug">
                          {conv.title}
                        </p>
                        <p
                          className={`mt-1 text-[11px] leading-none ${
                            isActive
                              ? "text-[color:var(--md-sys-color-on-secondary-container)]/75"
                              : "text-[color:var(--md-sys-color-on-surface-variant)]"
                          }`}
                        >
                          {formatTimestampLabel(conv.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </button>

                  <Popover
                    open={openMenuId === conv.conversationId}
                    onOpenChange={(open) =>
                      setOpenMenuId(open ? conv.conversationId : null)
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={isProcessing}
                        aria-label={`${conv.title} のメニューを開く`}
                        onClick={(event) => event.stopPropagation()}
                        className={`mr-1 mt-1 rounded-full ${
                          isActive
                            ? "text-[color:var(--md-sys-color-on-secondary-container)]/90 hover:bg-[color:var(--md-sys-color-on-secondary-container)]/15"
                            : "text-[color:var(--md-sys-color-on-surface-variant)]"
                        }`}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <EllipsisVertical className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      sideOffset={6}
                      className="w-44 p-1"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-[calc(var(--md-shape-sm)-2px)] px-2 py-1.5 text-left text-sm hover:bg-accent"
                        onClick={() => {
                          void handleRename(conv);
                        }}
                      >
                        <PencilLine className="h-3.5 w-3.5" />
                        名前を変更
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-[calc(var(--md-shape-sm)-2px)] px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          void handleDelete(conv);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        削除
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
