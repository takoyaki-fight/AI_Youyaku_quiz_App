"use client";

import { QuizCard } from "./QuizCard";

interface CardItem {
  cardId: string;
  tag: string;
  question: string;
  choices: string[];
  correctIndex: number;
  answer: string;
  explanation: string;
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
        {"\u30af\u30a4\u30ba\u30ab\u30fc\u30c9\u304c\u3042\u308a\u307e\u305b\u3093"}
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
          choices={card.choices}
          correctIndex={card.correctIndex}
          answer={card.answer}
          explanation={card.explanation}
          sources={card.sources}
          conversationId={card.conversationId}
        />
      ))}
    </div>
  );
}
