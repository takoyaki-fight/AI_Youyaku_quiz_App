"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BrainCircuit, Calendar, ChevronRight } from "lucide-react";

interface QuizSummary {
  quizId: string;
  targetDate: string;
  cards: Array<{ tag: string }>;
}

export default function DailyQuizPage() {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    apiGet<{ quizzes: QuizSummary[] }>("/api/v1/daily-quizzes")
      .then((data) => setQuizzes(data.quizzes))
      .catch(() => toast.error("Q&A一覧の取得に失敗しました"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[var(--md-shape-md)] bg-[color:var(--md-sys-color-primary-container)] text-[color:var(--md-sys-color-on-primary-container)] shadow-[var(--md-elevation-1)]">
          <BrainCircuit className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">日次Q&A</h1>
          <p className="text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
            会話履歴から作成された復習カード
          </p>
        </div>
      </div>

      {quizzes.length === 0 ? (
        <div className="rounded-[var(--md-shape-lg)] border border-border/70 bg-card py-14 text-center shadow-[var(--md-elevation-1)]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--md-shape-md)] bg-[color:var(--md-sys-color-surface-container)]">
            <BrainCircuit className="h-8 w-8 text-[color:var(--md-sys-color-on-surface-variant)]" />
          </div>
          <p className="text-sm text-foreground">まだQ&Aがありません</p>
          <p className="mt-1 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
            毎朝 07:00 (JST) に前日の会話から自動生成されます
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
                      <p className="text-sm font-semibold text-foreground">
                        {quiz.targetDate}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                          {quiz.cards.length}問
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {Array.from(new Set(quiz.cards.map((c) => c.tag))).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="px-1.5 py-0 text-[10px]"
                            >
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
  );
}
