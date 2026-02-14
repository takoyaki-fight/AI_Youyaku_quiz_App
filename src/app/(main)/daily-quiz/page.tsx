"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="w-8 h-8 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
          <BrainCircuit className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">日次Q&A</h1>
          <p className="text-xs text-gray-400">会話から自動生成された復習問題</p>
        </div>
      </div>
      {quizzes.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <BrainCircuit className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 text-sm">まだQ&Aがありません</p>
          <p className="text-gray-400 text-xs mt-1">毎朝 07:00 (JST) に前日の会話から自動生成されます</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {quizzes.map((quiz) => (
            <Card
              key={quiz.quizId}
              className="cursor-pointer group hover:shadow-md hover:border-gray-200 transition-all"
              onClick={() => router.push(`/daily-quiz/${quiz.targetDate}`)}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{quiz.targetDate}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">
                          {quiz.cards.length}問
                        </span>
                        <div className="flex gap-1">
                          {Array.from(new Set(quiz.cards.map((c) => c.tag))).map(
                            (tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                              >
                                {tag}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
