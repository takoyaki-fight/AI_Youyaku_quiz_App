"use client";

import { useCallback, useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, SendHorizonal } from "lucide-react";
import { apiPost } from "@/lib/api-client";
import type { ReactNode } from "react";

interface TermInfo {
  termId: string;
  surface: string;
  reading: string;
  definition: string;
  category: string;
}

interface TermPopoverProps {
  term: TermInfo | undefined;
  children: ReactNode;
  sharedTurns?: FollowupTurn[];
  onAppendSharedTurn?: (turn: FollowupTurn) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface FollowupTurn {
  question: string;
  answer: string;
}

interface FollowupResponse {
  answer: string;
}

const categoryLabels: Record<string, string> = {
  technical: "\u6280\u8853\u7528\u8A9E",
  proper_noun: "\u56FA\u6709\u540D\u8A5E",
  concept: "\u6982\u5FF5",
};

export function TermPopover({
  term,
  children,
  sharedTurns,
  onAppendSharedTurn,
  open,
  onOpenChange,
}: TermPopoverProps) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localTurns, setLocalTurns] = useState<FollowupTurn[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const turns = sharedTurns ?? localTurns;

  const handleAsk = useCallback(async () => {
    if (!term) return;

    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    try {
      const history = turns.slice(-6);
      const result = await apiPost<FollowupResponse>("/api/v1/terms/follow-up", {
        term: {
          termId: term.termId,
          surface: term.surface,
          reading: term.reading,
          definition: term.definition,
          category: term.category,
        },
        question: trimmed,
        history,
      });

      const newTurn = { question: trimmed, answer: result.answer };
      if (onAppendSharedTurn) {
        onAppendSharedTurn(newTurn);
      } else {
        setLocalTurns((prev) => [...prev, newTurn]);
      }
      setQuestion("");
      setTimeout(() => inputRef.current?.focus(), 0);
    } catch (e) {
      const message =
        e instanceof Error && e.message
          ? e.message
          : "\u88DC\u8DB3\u8AAC\u660E\u306E\u751F\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [loading, onAppendSharedTurn, question, term, turns]);

  if (!term) return <>{children}</>;

  const canSubmit = question.trim().length > 0 && !loading;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-[22rem] rounded-[var(--md-shape-lg)] border border-border/80 bg-popover p-3 shadow-[var(--md-elevation-2)]"
        side="top"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{term.surface}</span>
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {categoryLabels[term.category] || term.category}
            </Badge>
          </div>
          {term.reading && (
            <p className="text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
              {term.reading}
            </p>
          )}
          <p className="text-xs leading-relaxed text-foreground">{term.definition}</p>

          {turns.length > 0 && (
            <div className="max-h-44 space-y-2 overflow-y-auto rounded-[var(--md-shape-md)] border border-border/70 bg-[color:var(--md-sys-color-surface-container-low)] p-2">
              {turns.map((turn, index) => (
                <div
                  key={`${turn.question}-${index}`}
                  className="rounded-[var(--md-shape-sm)] bg-[color:var(--md-sys-color-surface-container)] p-2"
                >
                  <p className="text-[11px] font-medium text-[color:var(--md-sys-color-on-surface-variant)]">
                    Q: {turn.question}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-foreground">
                    {turn.answer}
                  </p>
                </div>
              ))}
            </div>
          )}

          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              void handleAsk();
            }}
          >
            <Input
              ref={inputRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={"\u3082\u3063\u3068\u8A73\u3057\u304F / \u3053\u306E\u8A9E\u306F\u4F55\uFF1F"}
              className="h-8 text-xs"
              maxLength={300}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-[color:var(--md-sys-color-on-surface-variant)]">
                {"\u3053\u3053\u3067\u8FFD\u52A0\u8CEA\u554F\u3067\u304D\u307E\u3059"}
              </p>
              <Button
                type="submit"
                size="icon-xs"
                disabled={!canSubmit}
                className="min-w-0"
                aria-label="\u8FFD\u52A0\u8CEA\u554F\u3092\u9001\u4FE1"
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <SendHorizonal className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
            {error && (
              <p className="text-[11px] text-[color:var(--md-sys-color-error)]">
                {error}
              </p>
            )}
          </form>
        </div>
      </PopoverContent>
    </Popover>
  );
}
