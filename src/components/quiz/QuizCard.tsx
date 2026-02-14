"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, ExternalLink } from "lucide-react";

interface QuizCardProps {
  tag: string;
  question: string;
  answer: string;
  sources: string[];
  conversationId: string;
}

const tagConfig: Record<string, { bg: string; text: string; border: string }> = {
  What: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Why: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  How: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  When: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  Example: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

export function QuizCard({
  tag,
  question,
  answer,
  sources,
  conversationId,
}: QuizCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const config = tagConfig[tag] || { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        showAnswer ? "ring-1 ring-blue-100 shadow-md" : "hover:translate-y-[-1px]"
      }`}
      onClick={() => setShowAnswer(!showAnswer)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className={`text-xs font-medium ${config.bg} ${config.text} ${config.border}`}
          >
            {tag}
          </Badge>
          <div className="text-gray-300">
            {showAnswer ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-medium mb-3 text-gray-800 leading-relaxed">{question}</p>
        {showAnswer ? (
          <div className="border-t border-gray-100 pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <p className="text-sm text-gray-600 leading-relaxed">{answer}</p>
            {sources.length > 0 && conversationId && (
              <a
                href={`/chat/${conversationId}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 mt-3 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                元の会話を見る
              </a>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Eye className="w-3 h-3" />
            タップで回答を表示
          </p>
        )}
      </CardContent>
    </Card>
  );
}
