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

const categoryColors: Record<string, string> = {
  technical: "bg-blue-100 text-blue-800",
  proper_noun: "bg-green-100 text-green-800",
  concept: "bg-purple-100 text-purple-800",
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
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Input
          placeholder="用語を検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <p className="text-xs text-gray-400 mt-2">
          {filtered.length} / {terms.length} 件
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              {search ? "該当する用語がありません" : "用語がまだありません"}
            </div>
          ) : (
            filtered.map((term) => (
              <div key={term.termId} className="p-4 hover:bg-gray-50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{term.surface}</span>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 ${categoryColors[term.category] || ""}`}
                  >
                    {categoryLabels[term.category] || term.category}
                  </Badge>
                </div>
                {term.reading && (
                  <p className="text-xs text-gray-400 mb-1">{term.reading}</p>
                )}
                <p className="text-xs text-gray-600 leading-relaxed">
                  {term.definition}
                </p>
                {onJumpToMessage && (
                  <button
                    onClick={() => onJumpToMessage(term.messageId)}
                    className="text-xs text-blue-500 hover:text-blue-700 mt-2"
                  >
                    出現箇所を表示
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
