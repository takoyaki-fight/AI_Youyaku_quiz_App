"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Eye, EyeOff, ExternalLink } from "lucide-react";

interface QuizCardProps {
  tag: string;
  question: string;
  choices: string[];
  correctIndex: number;
  answer: string;
  explanation: string;
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

const CHOICE_LABELS = ["A", "B", "C", "D"] as const;

export function QuizCard({
  tag,
  question,
  choices,
  correctIndex,
  answer,
  explanation,
  sources,
  conversationId,
}: QuizCardProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const safeAnswer = typeof answer === "string" ? answer : "";
  const safeExplanation = typeof explanation === "string" ? explanation : "";
  const config = tagConfig[tag] || {
    container: "bg-[color:var(--md-sys-color-surface-container)]",
    text: "text-[color:var(--md-sys-color-on-surface-variant)]",
  };

  const normalized = useMemo(() => {
    const cleanChoices = Array.isArray(choices)
      ? choices
          .map((choice) => (typeof choice === "string" ? choice.trim() : ""))
          .filter((choice) => choice.length > 0)
      : [];
    const resolvedCorrectIndex =
      Number.isInteger(correctIndex) &&
      correctIndex >= 0 &&
      correctIndex < cleanChoices.length
        ? correctIndex
        : cleanChoices.findIndex((choice) => choice === safeAnswer);

    return {
      choices: cleanChoices,
      correctIndex: resolvedCorrectIndex,
      hasMultipleChoice: cleanChoices.length === 4 && resolvedCorrectIndex >= 0,
    };
  }, [choices, correctIndex, safeAnswer]);

  return (
    <Card
      className={`cursor-pointer transition-all ${
        showExplanation
          ? "border-[color:color-mix(in_srgb,var(--md-sys-color-primary),transparent_70%)] shadow-[var(--md-elevation-2)]"
          : "hover:shadow-[var(--md-elevation-2)]"
      }`}
      onClick={() => setShowExplanation((prev) => !prev)}
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
            {showExplanation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <p className="mb-3 text-sm font-medium leading-relaxed text-foreground">
          {question}
        </p>

        {normalized.hasMultipleChoice ? (
          <div className="space-y-2">
            {normalized.choices.map((choice, index) => {
              const isCorrect = index === normalized.correctIndex;

              return (
                <div
                  key={`${choice}-${index}`}
                  className={`rounded-[var(--md-shape-sm)] border px-3 py-2 text-sm ${
                    showExplanation && isCorrect
                      ? "border-emerald-500/60 bg-emerald-500/10"
                      : "border-border/70 bg-[color:var(--md-sys-color-surface-container-low)]"
                  }`}
                >
                  <span className="font-medium text-[color:var(--md-sys-color-on-surface-variant)]">
                    {CHOICE_LABELS[index] ?? String(index + 1)}.
                  </span>{" "}
                  <span className="text-foreground">{choice}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[var(--md-shape-sm)] border border-border/70 bg-[color:var(--md-sys-color-surface-container-low)] px-3 py-2 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
            {
              "\u3053\u306e\u30ab\u30fc\u30c9\u306f4\u629e\u5f62\u5f0f\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002"
            }
          </div>
        )}

        {showExplanation ? (
          <div className="animate-in fade-in slide-in-from-top-1 mt-3 border-t border-border/70 pt-3 duration-200">
            <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {"\u6b63\u89e3: "}
              {safeAnswer}
            </div>
            <p className="text-sm leading-relaxed text-[color:var(--md-sys-color-on-surface-variant)]">
              {safeExplanation}
            </p>
            {conversationId && (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const encodedConversationId = encodeURIComponent(conversationId);
                  const firstSource = sources[0];
                  const targetUrl = firstSource
                    ? `/chat/${encodedConversationId}?highlight=${encodeURIComponent(firstSource)}`
                    : `/chat/${encodedConversationId}`;

                  window.open(targetUrl, "_blank", "noopener,noreferrer");
                }}
                className="mt-3 inline-flex items-center gap-1 text-xs text-primary transition-colors hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {"\u5143\u306e\u4f1a\u8a71\u3092\u958b\u304f"}
              </button>
            )}
          </div>
        ) : (
          <p className="mt-3 flex items-center gap-1 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
            <Eye className="h-3 w-3" />
            {"\u30bf\u30c3\u30d7\u3067\u89e3\u8aac\u3092\u8868\u793a"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
