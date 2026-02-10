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
      <PopoverContent className="w-72 p-3" side="top">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{term.surface}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {categoryLabels[term.category] || term.category}
            </Badge>
          </div>
          {term.reading && (
            <p className="text-xs text-gray-400">{term.reading}</p>
          )}
          <p className="text-xs text-gray-700 leading-relaxed">
            {term.definition}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
