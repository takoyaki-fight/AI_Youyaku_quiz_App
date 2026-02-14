"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TermItem {
  termId: string;
  surface: string;
  reading: string;
  definition: string;
  category: string;
  messageId: string;
}

const categoryLabels: Record<string, string> = {
  technical: "技術用語",
  proper_noun: "固有名詞",
  concept: "概念",
};

const categoryClassNames: Record<string, string> = {
  technical:
    "bg-[color:color-mix(in_srgb,var(--md-sys-color-primary-container),white_16%)] text-[color:var(--md-sys-color-on-primary-container)]",
  proper_noun:
    "bg-[color:color-mix(in_srgb,var(--md-sys-color-secondary-container),white_10%)] text-[color:var(--md-sys-color-on-secondary-container)]",
  concept:
    "bg-[color:color-mix(in_srgb,var(--md-sys-color-tertiary-container),white_10%)] text-[color:var(--md-sys-color-on-tertiary-container)]",
};

interface TermListProps {
  terms: TermItem[];
  onJumpToMessage?: (messageId: string) => void;
}

export function TermList({ terms, onJumpToMessage }: TermListProps) {
  const [search, setSearch] = useState("");

  const filtered = terms.filter(
    (t) =>
      t.surface.includes(search) ||
      t.reading.includes(search) ||
      t.definition.includes(search)
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/70 bg-[color:var(--md-sys-color-surface-container-low)] p-4">
        <Input
          placeholder="用語を検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <p className="mt-2 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
          {filtered.length} / {terms.length} 件
        </p>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-y divide-border/60">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-[color:var(--md-sys-color-on-surface-variant)]">
              {search ? "一致する用語がありません" : "用語がまだありません"}
            </div>
          ) : (
            filtered.map((term) => (
              <div
                key={term.termId}
                className="p-4 transition-colors hover:bg-[color:var(--md-sys-color-surface-container-low)]"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {term.surface}
                  </span>
                  <Badge
                    variant="secondary"
                    className={`px-1.5 py-0 text-[10px] ${categoryClassNames[term.category] || ""}`}
                  >
                    {categoryLabels[term.category] || term.category}
                  </Badge>
                </div>

                {term.reading && (
                  <p className="mb-1 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                    {term.reading}
                  </p>
                )}

                <p className="text-xs leading-relaxed text-[color:var(--md-sys-color-on-surface-variant)]">
                  {term.definition}
                </p>

                {onJumpToMessage && (
                  <button
                    onClick={() => onJumpToMessage(term.messageId)}
                    className="mt-2 text-xs text-primary hover:underline"
                  >
                    出現した会話を開く
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
