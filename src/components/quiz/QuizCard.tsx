"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QuizCardProps {
  tag: string;
  question: string;
  answer: string;
  sources: string[];
  conversationId: string;
}

const tagColors: Record<string, string> = {
  What: "bg-blue-100 text-blue-800",
  Why: "bg-orange-100 text-orange-800",
  How: "bg-green-100 text-green-800",
  When: "bg-purple-100 text-purple-800",
  Example: "bg-pink-100 text-pink-800",
};

export function QuizCard({
  tag,
  question,
  answer,
  sources,
  conversationId,
}: QuizCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <Card className="cursor-pointer" onClick={() => setShowAnswer(!showAnswer)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Badge className={`text-xs ${tagColors[tag] || ""}`}>{tag}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-medium mb-3">{question}</p>
        {showAnswer ? (
          <div className="border-t pt-3">
            <p className="text-sm text-gray-700 leading-relaxed">{answer}</p>
            {sources.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {conversationId && (
                  <a
                    href={`/chat/${conversationId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-blue-500 hover:text-blue-700"
                  >
                    元の会話を見る
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400">タップで回答を表示</p>
        )}
      </CardContent>
    </Card>
  );
}
