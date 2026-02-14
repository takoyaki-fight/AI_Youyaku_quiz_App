"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { ArrowLeft, Loader2, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { QuizCardList } from "@/components/quiz/QuizCardList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api-client";

interface CardItem {
  cardId: string;
  tag: string;
  question: string;
  choices: string[];
  correctIndex: number;
  answer: string;
  explanation: string;
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
      toast.success("\u30af\u30a4\u30ba\u3092\u518d\u751f\u6210\u3057\u307e\u3057\u305f");
      fetchQuiz();
    } catch {
      toast.error("\u518d\u751f\u6210\u306b\u5931\u6557\u3057\u307e\u3057\u305f");
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
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push("/daily-quiz")}
            aria-label="\u4e00\u89a7\u306b\u623b\u308b"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{date}</h1>
            {quiz && (
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  v{quiz.version}
                </Badge>
                <span className="text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                  {quiz.cards.length}
                  {"\u554f"}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => router.push(`/daily-quiz/${date}/study`)}
            disabled={!quiz || quiz.cards.length === 0}
            className="gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            {"\u30af\u30a4\u30ba\u30b9\u30bf\u30fc\u30c8"}
          </Button>
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
            {regenerating
              ? "\u518d\u751f\u6210\u4e2d..."
              : "\u518d\u751f\u6210"}
          </Button>
        </div>
      </div>

      {quiz ? (
        <QuizCardList cards={quiz.cards} />
      ) : (
        <div className="rounded-[var(--md-shape-lg)] border border-border/70 bg-card py-16 text-center shadow-[var(--md-elevation-1)]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--md-shape-md)] bg-[color:var(--md-sys-color-surface-container)]">
            <RefreshCw className="h-8 w-8 text-[color:var(--md-sys-color-on-surface-variant)]" />
          </div>
          <p className="text-sm text-foreground">
            {"\u3053\u306e\u65e5\u306e\u30af\u30a4\u30ba\u306f\u3042\u308a\u307e\u305b\u3093"}
          </p>
        </div>
      )}
    </div>
  );
}
