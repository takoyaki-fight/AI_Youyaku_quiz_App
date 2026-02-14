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

const tagConfig: Record<string, { container: string; text: string }> = {
  What: {
    container:
      "bg-[color:color-mix(in_srgb,var(--md-sys-color-primary-container),white_14%)]",
    text: "text-[color:var(--md-sys-color-on-primary-container)]",
  },
  Why: {
    container:
      "bg-[color:color-mix(in_srgb,var(--md-sys-color-secondary-container),white_12%)]",
    text: "text-[color:var(--md-sys-color-on-secondary-container)]",
  },
  How: {
    container:
      "bg-[color:color-mix(in_srgb,var(--md-sys-color-tertiary-container),white_10%)]",
    text: "text-[color:var(--md-sys-color-on-tertiary-container)]",
  },
  When: {
    container: "bg-[color:var(--md-sys-color-surface-container)]",
    text: "text-[color:var(--md-sys-color-on-surface-variant)]",
  },
  Example: {
    container:
      "bg-[color:color-mix(in_srgb,var(--md-sys-color-primary-container),white_28%)]",
    text: "text-[color:var(--md-sys-color-on-primary-container)]",
  },
};

export function QuizCard({
  tag,
  question,
  answer,
  sources,
  conversationId,
}: QuizCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const config = tagConfig[tag] || {
    container: "bg-[color:var(--md-sys-color-surface-container)]",
    text: "text-[color:var(--md-sys-color-on-surface-variant)]",
  };

  return (
    <Card
      className={`cursor-pointer transition-all ${
        showAnswer
          ? "border-[color:color-mix(in_srgb,var(--md-sys-color-primary),transparent_70%)] shadow-[var(--md-elevation-2)]"
          : "hover:shadow-[var(--md-elevation-2)]"
      }`}
      onClick={() => setShowAnswer((prev) => !prev)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className={`text-xs font-medium ${config.container} ${config.text}`}
          >
            {tag}
          </Badge>
          <div className="text-[color:var(--md-sys-color-outline)]">
            {showAnswer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <p className="mb-3 text-sm font-medium leading-relaxed text-foreground">
          {question}
        </p>
        {showAnswer ? (
          <div className="animate-in fade-in slide-in-from-top-1 border-t border-border/70 pt-3 duration-200">
            <p className="text-sm leading-relaxed text-[color:var(--md-sys-color-on-surface-variant)]">
              {answer}
            </p>
            {sources.length > 0 && conversationId && (
              <a
                href={`/chat/${conversationId}`}
                onClick={(e) => e.stopPropagation()}
                className="mt-3 inline-flex items-center gap-1 text-xs text-primary transition-colors hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                元の会話を開く
              </a>
            )}
          </div>
        ) : (
          <p className="flex items-center gap-1 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
            <Eye className="h-3 w-3" />
            タップで回答を表示
          </p>
        )}
      </CardContent>
    </Card>
  );
}
