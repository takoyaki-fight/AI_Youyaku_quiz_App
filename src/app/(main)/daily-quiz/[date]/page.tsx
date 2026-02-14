"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QuizCardList } from "@/components/quiz/QuizCardList";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api-client";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CardItem {
  cardId: string;
  tag: string;
  question: string;
  answer: string;
  sources: string[];
  conversationId: string;
}

interface QuizDetail {
  quizId: string;
  targetDate: string;
  version: number;
  cards: CardItem[];
}

export default function DailyQuizDatePage() {
  const params = useParams();
  const router = useRouter();
  const date = params.date as string;
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const fetchQuiz = useCallback(() => {
    setLoading(true);
    apiGet<{ quiz: QuizDetail }>(`/api/v1/daily-quizzes/${date}`)
      .then((data) => setQuiz(data.quiz))
      .catch(() => setQuiz(null))
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await apiPost(`/api/v1/daily-quizzes/${date}/regenerate`, {}, uuidv4());
      toast.success("Q&Aを再生成しました");
      fetchQuiz();
    } catch {
      toast.error("再生成に失敗しました");
    } finally {
      setRegenerating(false);
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
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push("/daily-quiz")}
            aria-label="一覧へ戻る"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{date}</h1>
            <div className="mt-0.5 flex items-center gap-2">
              {quiz && (
                <Badge variant="secondary" className="text-[10px]">
                  v{quiz.version}
                </Badge>
              )}
              {quiz && (
                <span className="text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                  {quiz.cards.length}問
                </span>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRegenerate}
          disabled={regenerating}
          className="gap-1.5"
        >
          {regenerating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {regenerating ? "再生成中..." : "再生成"}
        </Button>
      </div>

      {quiz ? (
        <QuizCardList cards={quiz.cards} />
      ) : (
        <div className="rounded-[var(--md-shape-lg)] border border-border/70 bg-card py-16 text-center shadow-[var(--md-elevation-1)]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--md-shape-md)] bg-[color:var(--md-sys-color-surface-container)]">
            <RefreshCw className="h-8 w-8 text-[color:var(--md-sys-color-on-surface-variant)]" />
          </div>
          <p className="text-sm text-foreground">この日のQ&Aはありません</p>
        </div>
      )}
    </div>
  );
}
