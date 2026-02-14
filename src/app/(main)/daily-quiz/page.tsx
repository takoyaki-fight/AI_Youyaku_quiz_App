"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import {
  BrainCircuit,
  Calendar,
  ChevronRight,
  Loader2,
  MessagesSquare,
  Sparkles,
} from "lucide-react";

interface QuizSummary {
  quizId: string;
  targetDate: string;
  cards: Array<{ tag: string }>;
}

interface ConversationOption {
  conversationId: string;
  title: string;
  messageCount: number;
}

interface ManualGenerateResponse {
  quiz: {
    targetDate: string;
  };
  currentVersion: number;
}

export default function DailyQuizPage() {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [conversationOptions, setConversationOptions] = useState<ConversationOption[]>([]);
  const [selectedConversationIds, setSelectedConversationIds] = useState<string[]>([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [manualGenerating, setManualGenerating] = useState(false);
  const router = useRouter();

  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ quizzes: QuizSummary[] }>("/api/v1/daily-quizzes");
      setQuizzes(data.quizzes);
    } catch {
      toast.error("Q&A一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConversationOptions = useCallback(async () => {
    setConversationLoading(true);
    try {
      const data = await apiGet<{ conversations: ConversationOption[] }>(
        "/api/v1/conversations"
      );

      const withMessages = data.conversations.filter((conv) => conv.messageCount > 0);
      setConversationOptions(withMessages);
      setSelectedConversationIds((prev) =>
        prev.filter((id) => withMessages.some((conv) => conv.conversationId === id))
      );
    } catch {
      toast.error("チャット一覧の取得に失敗しました");
    } finally {
      setConversationLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchQuizzes();
  }, [fetchQuizzes]);

  const selectedCount = selectedConversationIds.length;
  const allSelected = useMemo(
    () =>
      conversationOptions.length > 0 && selectedCount === conversationOptions.length,
    [conversationOptions.length, selectedCount]
  );

  const handleOpenManualDialog = () => {
    setManualDialogOpen(true);
    void fetchConversationOptions();
  };

  const toggleConversation = (conversationId: string) => {
    setSelectedConversationIds((prev) =>
      prev.includes(conversationId)
        ? prev.filter((id) => id !== conversationId)
        : [...prev, conversationId]
    );
  };

  const handleManualGenerate = async () => {
    if (selectedConversationIds.length === 0) {
      toast.error("対象チャットを1つ以上選択してください");
      return;
    }

    setManualGenerating(true);
    try {
      const result = await apiPost<ManualGenerateResponse>(
        "/api/v1/daily-quizzes/manual",
        {
          conversationIds: selectedConversationIds,
        },
        uuidv4()
      );

      toast.success("Q&Aを生成しました");
      setManualDialogOpen(false);
      await fetchQuizzes();
      router.push(`/daily-quiz/${result.quiz.targetDate}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "手動生成に失敗しました";
      toast.error(message);
    } finally {
      setManualGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[var(--md-shape-md)] bg-[color:var(--md-sys-color-primary-container)] text-[color:var(--md-sys-color-on-primary-container)] shadow-[var(--md-elevation-1)]">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Daily Quiz</h1>
              <p className="text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                チャット履歴から生成したQ&Aを確認できます
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleOpenManualDialog}>
            <Sparkles className="h-3.5 w-3.5" />
            手動生成
          </Button>
        </div>

        {quizzes.length === 0 ? (
          <div className="rounded-[var(--md-shape-lg)] border border-border/70 bg-card py-14 text-center shadow-[var(--md-elevation-1)]">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--md-shape-md)] bg-[color:var(--md-sys-color-surface-container)]">
              <BrainCircuit className="h-8 w-8 text-[color:var(--md-sys-color-on-surface-variant)]" />
            </div>
            <p className="text-sm text-foreground">まだQ&Aがありません</p>
            <p className="mt-1 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
              右上の「手動生成」から対象チャットを選んで作成できます
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {quizzes.map((quiz) => (
              <Card
                key={quiz.quizId}
                className="cursor-pointer transition-all hover:shadow-[var(--md-elevation-2)]"
                onClick={() => router.push(`/daily-quiz/${quiz.targetDate}`)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[var(--md-shape-sm)] bg-[color:var(--md-sys-color-secondary-container)] text-[color:var(--md-sys-color-on-secondary-container)]">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{quiz.targetDate}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                            {quiz.cards.length}問
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {Array.from(new Set(quiz.cards.map((c) => c.tag))).map((tag) => (
                              <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-[10px]">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[color:var(--md-sys-color-outline)]" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessagesSquare className="h-4 w-4" />
              手動でQ&Aを生成
            </DialogTitle>
            <DialogDescription>
              対象にするチャットを選択して、今すぐQ&Aを作成します。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                選択中: {selectedCount} / {conversationOptions.length}
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() =>
                    setSelectedConversationIds(
                      allSelected
                        ? []
                        : conversationOptions.map((conv) => conv.conversationId)
                    )
                  }
                  disabled={conversationLoading || conversationOptions.length === 0}
                >
                  {allSelected ? "全解除" : "全選択"}
                </Button>
              </div>
            </div>

            <div className="rounded-[var(--md-shape-md)] border border-border/70">
              {conversationLoading ? (
                <div className="flex items-center justify-center gap-2 p-6 text-sm text-[color:var(--md-sys-color-on-surface-variant)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  読み込み中...
                </div>
              ) : conversationOptions.length === 0 ? (
                <p className="p-6 text-center text-sm text-[color:var(--md-sys-color-on-surface-variant)]">
                  メッセージがあるチャットが見つかりません。
                </p>
              ) : (
                <ScrollArea className="h-72 p-2">
                  <div className="space-y-1">
                    {conversationOptions.map((conv) => {
                      const checked = selectedConversationIds.includes(conv.conversationId);

                      return (
                        <label
                          key={conv.conversationId}
                          className={`flex cursor-pointer items-start gap-3 rounded-[var(--md-shape-sm)] border px-3 py-2 transition-colors ${
                            checked
                              ? "border-[color:var(--md-sys-color-primary)] bg-[color:var(--md-sys-color-primary-container)]/45"
                              : "border-transparent hover:bg-[color:var(--md-sys-color-surface-container)]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                            checked={checked}
                            onChange={() => toggleConversation(conv.conversationId)}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-foreground">{conv.title}</p>
                            <p className="mt-0.5 text-[11px] text-[color:var(--md-sys-color-on-surface-variant)]">
                              {conv.messageCount} メッセージ
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setManualDialogOpen(false)}
              disabled={manualGenerating}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleManualGenerate}
              disabled={
                manualGenerating || conversationLoading || selectedConversationIds.length === 0
              }
              className="gap-1.5"
            >
              {manualGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {manualGenerating ? "生成中..." : "この条件で生成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
