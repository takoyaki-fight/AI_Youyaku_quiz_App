"use client";

import { useEffect, useState } from "react";
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
        <div className="w-8 h-8 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-lg"
            onClick={() => router.push("/daily-quiz")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{date}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {quiz && (
                <Badge variant="secondary" className="text-[10px]">
                  v{quiz.version}
                </Badge>
              )}
              {quiz && (
                <span className="text-xs text-gray-400">{quiz.cards.length}問</span>
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
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {regenerating ? "再生成中..." : "再生成"}
        </Button>
      </div>
      {quiz ? (
        <QuizCardList cards={quiz.cards} />
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 text-sm">この日のQ&Aはありません</p>
        </div>
      )}
    </div>
  );
}
