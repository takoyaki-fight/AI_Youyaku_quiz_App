"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QuizCardList } from "@/components/quiz/QuizCardList";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api-client";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

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

  const fetchQuiz = () => {
    setLoading(true);
    apiGet<{ quiz: QuizDetail }>(`/api/v1/daily-quizzes/${date}`)
      .then((data) => setQuiz(data.quiz))
      .catch(() => setQuiz(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchQuiz();
  }, [date]);

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
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/daily-quiz")}
          >
            ← 一覧に戻る
          </Button>
          <h1 className="text-xl font-bold">{date}</h1>
          {quiz && (
            <span className="text-sm text-gray-400">v{quiz.version}</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRegenerate}
          disabled={regenerating}
        >
          {regenerating ? "再生成中..." : "再生成"}
        </Button>
      </div>
      {quiz ? (
        <QuizCardList cards={quiz.cards} />
      ) : (
        <div className="text-center text-gray-400 py-12 text-sm">
          この日のQ&Aはありません
        </div>
      )}
    </div>
  );
}
