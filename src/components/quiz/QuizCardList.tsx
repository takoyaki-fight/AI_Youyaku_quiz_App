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
      <div className="text-center text-gray-400 py-12 text-sm">
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
