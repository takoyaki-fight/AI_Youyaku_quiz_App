"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
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
}

const categoryLabels: Record<string, string> = {
  technical: "技術用語",
  proper_noun: "固有名詞",
  concept: "概念",
};

export function TermPopover({ term, children }: TermPopoverProps) {
  if (!term) return <>{children}</>;

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-72 rounded-[var(--md-shape-lg)] border border-border/80 bg-popover p-3 shadow-[var(--md-elevation-2)]"
        side="top"
      >
        <div className="space-y-2">
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
