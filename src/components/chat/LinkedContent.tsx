"use client";

import { ReactNode } from "react";
import { TermPopover } from "./TermPopover";

interface TermInfo {
  termId: string;
  surface: string;
  reading: string;
  definition: string;
  category: string;
}

interface MentionInfo {
  termId: string;
  surface: string;
  startOffset: number;
  endOffset: number;
}

interface LinkedContentProps {
  content: string;
  mentions: MentionInfo[];
  terms: TermInfo[];
}

export function LinkedContent({ content, mentions, terms }: LinkedContentProps) {
  if (!mentions || mentions.length === 0) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  // オフセット順にソート
  const sorted = [...mentions].sort((a, b) => a.startOffset - b.startOffset);
  const segments: ReactNode[] = [];
  let lastEnd = 0;

  for (let i = 0; i < sorted.length; i++) {
    const mention = sorted[i];

    // 範囲外チェック
    if (mention.startOffset >= content.length || mention.endOffset > content.length) {
      continue;
    }

    // リンク前のプレーンテキスト
    if (mention.startOffset > lastEnd) {
      segments.push(
        <span key={`text-${i}`} className="whitespace-pre-wrap">
          {content.substring(lastEnd, mention.startOffset)}
        </span>
      );
    }

    // リンク化されたテキスト
    const term = terms.find((t) => t.termId === mention.termId);
    segments.push(
      <TermPopover key={`term-${i}`} term={term}>
        <span className="text-blue-600 underline decoration-dotted cursor-pointer hover:text-blue-800">
          {content.substring(mention.startOffset, mention.endOffset)}
        </span>
      </TermPopover>
    );

    lastEnd = mention.endOffset;
  }

  // 残りのテキスト
  if (lastEnd < content.length) {
    segments.push(
      <span key="text-end" className="whitespace-pre-wrap">
        {content.substring(lastEnd)}
      </span>
    );
  }

  return <>{segments}</>;
}
