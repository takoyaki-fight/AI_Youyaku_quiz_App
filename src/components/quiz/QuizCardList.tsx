"use client";

import { QuizCard } from "./QuizCard";

interface CardItem {
  cardId: string;
  tag: string;
  question: string;
  answer: string;
  sources: string[];
  conversationId: string;
}

interface QuizCardListProps {
  cards: CardItem[];
}

export function QuizCardList({ cards }: QuizCardListProps) {
  if (cards.length === 0) {
    return (
      <div className="rounded-[var(--md-shape-lg)] border border-border/70 bg-card py-12 text-center text-sm text-[color:var(--md-sys-color-on-surface-variant)] shadow-[var(--md-elevation-1)]">
        カードがありません
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((card) => (
        <QuizCard
          key={card.cardId}
          tag={card.tag}
          question={card.question}
          answer={card.answer}
          sources={card.sources}
          conversationId={card.conversationId}
        />
      ))}
    </div>
  );
}
