"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-6">日次Q&A</h1>
      {quizzes.length === 0 ? (
        <div className="text-center text-gray-400 py-12 text-sm">
          <p>まだQ&Aがありません。</p>
          <p className="mt-1">毎朝07:00(JST)に前日の会話から自動生成されます。</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {quizzes.map((quiz) => (
            <Card
              key={quiz.quizId}
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => router.push(`/daily-quiz/${quiz.targetDate}`)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{quiz.targetDate}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {quiz.cards.length}問
                  </span>
                  <div className="flex gap-1">
                    {Array.from(new Set(quiz.cards.map((c) => c.tag))).map(
                      (tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {tag}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
