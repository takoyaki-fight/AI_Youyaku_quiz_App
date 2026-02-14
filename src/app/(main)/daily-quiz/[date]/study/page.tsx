"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/api-client";

interface RawQuizCardItem {
  cardId: string;
  tag: string;
  question: string;
  choices?: unknown;
  correctIndex?: unknown;
  answer?: unknown;
  explanation?: unknown;
  sources?: unknown;
  conversationId?: unknown;
}

interface QuizCardItem {
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

interface RawQuizDetail {
  quizId: string;
  targetDate: string;
  version: number;
  cards: RawQuizCardItem[];
}

interface QuizDetail {
  quizId: string;
  targetDate: string;
  version: number;
  cards: QuizCardItem[];
}

interface ReviewResult {
  card: QuizCardItem;
  selectedIndex: number;
  isCorrect: boolean;
}

const CHOICE_LABELS = ["A", "B", "C", "D"] as const;

function normalizeCard(raw: RawQuizCardItem): QuizCardItem | null {
  const question = typeof raw.question === "string" ? raw.question.trim() : "";
  if (!question) return null;

  const choices = Array.isArray(raw.choices)
    ? raw.choices
        .map((choice) => (typeof choice === "string" ? choice.trim() : ""))
        .filter((choice) => choice.length > 0)
    : [];
  if (choices.length !== 4 || new Set(choices).size !== 4) return null;

  const answer = typeof raw.answer === "string" ? raw.answer.trim() : "";
  const fromAnswerIndex = answer ? choices.findIndex((choice) => choice === answer) : -1;
  const numericCorrectIndex =
    typeof raw.correctIndex === "number" &&
    Number.isInteger(raw.correctIndex) &&
    raw.correctIndex >= 0 &&
    raw.correctIndex < 4
      ? raw.correctIndex
      : -1;
  const correctIndex = numericCorrectIndex >= 0 ? numericCorrectIndex : fromAnswerIndex;
  if (correctIndex < 0) return null;

  const resolvedAnswer = answer || choices[correctIndex];
  const explanation =
    typeof raw.explanation === "string" && raw.explanation.trim().length > 0
      ? raw.explanation.trim()
      : resolvedAnswer;
  const sources = Array.isArray(raw.sources)
    ? raw.sources.filter(
        (value): value is string => typeof value === "string" && value.length > 0
      )
    : [];

  return {
    cardId: raw.cardId,
    tag: raw.tag,
    question,
    choices,
    correctIndex,
    answer: resolvedAnswer,
    explanation,
    sources,
    conversationId:
      typeof raw.conversationId === "string" ? raw.conversationId : "",
  };
}

export default function DailyQuizStudyPage() {
  const params = useParams();
  const router = useRouter();
  const date = params.date as string;

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [deck, setDeck] = useState<QuizCardItem[]>([]);
  const [cursor, setCursor] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [reviewResults, setReviewResults] = useState<ReviewResult[]>([]);
  const [knownCards, setKnownCards] = useState<QuizCardItem[]>([]);
  const [unknownCards, setUnknownCards] = useState<QuizCardItem[]>([]);
  const [requiresRegeneration, setRequiresRegeneration] = useState(false);

  const currentCard = deck[cursor] ?? null;
  const total = deck.length;
  const answered = selectedChoice !== null;
  const isComplete = total > 0 && cursor >= total;
  const progress = total > 0 ? Math.round(((cursor + (answered ? 1 : 0)) / total) * 100) : 0;

  const resetSession = useCallback((nextDeck: QuizCardItem[]) => {
    setDeck(nextDeck);
    setCursor(0);
    setSelectedChoice(null);
    setReviewResults([]);
    setKnownCards([]);
    setUnknownCards([]);
  }, []);

  const fetchQuiz = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ quiz: RawQuizDetail }>(`/api/v1/daily-quizzes/${date}`);
      const normalizedCards = (data.quiz.cards || [])
        .map(normalizeCard)
        .filter((card): card is QuizCardItem => card !== null);

      const noFourChoiceCard = data.quiz.cards.length > 0 && normalizedCards.length === 0;
      setRequiresRegeneration(noFourChoiceCard);
      if (noFourChoiceCard) {
        toast.error(
          "\u3053\u306e\u30af\u30a4\u30ba\u306f\u65e7\u5f62\u5f0f\u3067\u3059\u3002\u518d\u751f\u6210\u3057\u3066\u304f\u3060\u3055\u3044\u3002"
        );
      }

      const normalizedQuiz: QuizDetail = {
        quizId: data.quiz.quizId,
        targetDate: data.quiz.targetDate,
        version: data.quiz.version,
        cards: normalizedCards,
      };

      setQuiz(normalizedQuiz);
      resetSession(normalizedCards);
    } catch {
      setQuiz(null);
      setDeck([]);
      toast.error("\u30af\u30a4\u30ba\u306e\u53d6\u5f97\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002");
    } finally {
      setLoading(false);
    }
  }, [date, resetSession]);

  useEffect(() => {
    void fetchQuiz();
  }, [fetchQuiz]);

  const selectChoice = useCallback(
    (choiceIndex: number) => {
      if (!currentCard || answered) return;

      const isCorrect = choiceIndex === currentCard.correctIndex;
      setSelectedChoice(choiceIndex);
      setReviewResults((prev) => [
        ...prev,
        { card: currentCard, selectedIndex: choiceIndex, isCorrect },
      ]);

      if (isCorrect) {
        setKnownCards((prev) => [...prev, currentCard]);
      } else {
        setUnknownCards((prev) => [...prev, currentCard]);
      }
    },
    [answered, currentCard]
  );

  const goNext = useCallback(() => {
    if (!answered) return;
    setCursor((prev) => prev + 1);
    setSelectedChoice(null);
  }, [answered]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!currentCard || isComplete) return;

      if (!answered) {
        if (event.key === "1") {
          event.preventDefault();
          selectChoice(0);
        } else if (event.key === "2") {
          event.preventDefault();
          selectChoice(1);
        } else if (event.key === "3") {
          event.preventDefault();
          selectChoice(2);
        } else if (event.key === "4") {
          event.preventDefault();
          selectChoice(3);
        }
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [answered, currentCard, goNext, isComplete, selectChoice]);

  const currentResult = useMemo(() => {
    if (!answered || !currentCard || selectedChoice === null) return null;
    return {
      isCorrect: selectedChoice === currentCard.correctIndex,
      selectedText: currentCard.choices[selectedChoice],
      correctText: currentCard.choices[currentCard.correctIndex],
    };
  }, [answered, currentCard, selectedChoice]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!quiz || quiz.cards.length === 0) {
    return (
      <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl items-center justify-center p-6">
        <div className="w-full rounded-[var(--md-shape-lg)] border border-border/70 bg-card p-8 text-center shadow-[var(--md-elevation-1)]">
          <p className="text-sm font-medium text-foreground">
            {requiresRegeneration
              ? "\u0034\u629e\u5f62\u5f0f\u306b\u3059\u308b\u306b\u306f\u518d\u751f\u6210\u304c\u5fc5\u8981\u3067\u3059\u3002"
              : "\u3053\u306e\u65e5\u306e\u30af\u30a4\u30ba\u306f\u3042\u308a\u307e\u305b\u3093\u3002"}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => router.push(`/daily-quiz/${date}`)}
          >
            <ArrowLeft className="h-4 w-4" />
            {"\u8a73\u7d30\u306b\u623b\u308b"}
          </Button>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl items-center justify-center p-6">
        <div className="w-full rounded-[var(--md-shape-lg)] border border-border/70 bg-card p-6 shadow-[var(--md-elevation-1)]">
          <h1 className="text-lg font-semibold text-foreground">
            {"\u30bb\u30c3\u30b7\u30e7\u30f3\u5b8c\u4e86"}
          </h1>
          <p className="mt-1 text-sm text-[color:var(--md-sys-color-on-surface-variant)]">
            {`${date}\u306e4\u629e\u30af\u30a4\u30ba\u3092\u3059\u3079\u3066\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002`}
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-[var(--md-shape-md)] border border-border/70 bg-[color:var(--md-sys-color-surface-container-low)] p-3">
              <p className="text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                {"\u6b63\u89e3"}
              </p>
              <p className="text-xl font-semibold text-foreground">{knownCards.length}</p>
            </div>
            <div className="rounded-[var(--md-shape-md)] border border-border/70 bg-[color:var(--md-sys-color-surface-container-low)] p-3">
              <p className="text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                {"\u4e0d\u6b63\u89e3"}
              </p>
              <p className="text-xl font-semibold text-foreground">{unknownCards.length}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={unknownCards.length === 0}
              onClick={() => resetSession([...unknownCards])}
            >
              <RotateCcw className="h-4 w-4" />
              {"\u4e0d\u6b63\u89e3\u3060\u3051\u5fa9\u7fd2"}
            </Button>
            <Button onClick={() => resetSession(quiz.cards)}>
              <RotateCcw className="h-4 w-4" />
              {"\u6700\u521d\u304b\u3089\u3084\u308a\u76f4\u3059"}
            </Button>
            <Button variant="ghost" onClick={() => router.push(`/daily-quiz/${date}`)}>
              <ArrowLeft className="h-4 w-4" />
              {"\u8a73\u7d30\u306b\u623b\u308b"}
            </Button>
          </div>

          {reviewResults.length > 0 && (
            <section className="mt-6">
              <h2 className="text-sm font-semibold text-foreground">
                {"\u7d50\u679c\u4e00\u89a7"}
              </h2>
              <p className="mt-1 text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                {
                  "\u5404\u884c\u3092\u30af\u30ea\u30c3\u30af\u3059\u308b\u3068\u89e3\u8aac\u3092\u8868\u793a\u3067\u304d\u307e\u3059\u3002"
                }
              </p>

              <div className="mt-3 max-h-[42vh] overflow-y-auto rounded-[var(--md-shape-md)] border border-border/70 bg-[color:var(--md-sys-color-surface-container-low)] px-2">
                <Accordion type="single" collapsible className="w-full">
                  {reviewResults.map((result, index) => (
                    <AccordionItem
                      key={`${result.card.cardId}-${index}`}
                      value={`${result.card.cardId}-${index}`}
                      className="px-2"
                    >
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <div className="flex min-w-0 items-center gap-3">
                          {result.isCorrect ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                          ) : (
                            <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {index + 1}. {result.card.question}
                            </p>
                            <p className="text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
                              {result.isCorrect
                                ? "\u6b63\u89e3"
                                : "\u4e0d\u6b63\u89e3"}{" "}
                              /{" "}
                              {result.card.tag}
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-3">
                        <div className="space-y-2 rounded-[var(--md-shape-sm)] border border-border/60 bg-card p-3">
                          <p className="text-sm text-foreground">
                            {"\u3042\u306a\u305f\u306e\u56de\u7b54: "}
                            {result.card.choices[result.selectedIndex] ?? "-"}
                          </p>
                          <p className="text-sm text-foreground">
                            {"\u6b63\u89e3: "}
                            {result.card.choices[result.card.correctIndex]}
                          </p>
                          <div className="border-t border-border/70 pt-2">
                            <p className="mb-1 text-[11px] font-semibold tracking-wide text-[color:var(--md-sys-color-on-surface-variant)]">
                              {"\u89e3\u8aac"}
                            </p>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                              {result.card.explanation}
                            </p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-5xl flex-col p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/daily-quiz/${date}`)}>
          <ArrowLeft className="h-4 w-4" />
          {"\u8a73\u7d30\u306b\u623b\u308b"}
        </Button>
        <div className="text-right">
          <p className="text-sm font-semibold text-foreground">
            {"\u0034\u629e\u30af\u30a4\u30ba"}
          </p>
          <p className="text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
            {cursor + 1} / {total}
          </p>
        </div>
      </div>

      <div className="mb-3 h-2 overflow-hidden rounded-full bg-[color:var(--md-sys-color-surface-container)]">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mb-4 flex items-center justify-between text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
        <span>
          {"\u9078\u629e\u80a2\u30921\u3064\u9078\u3093\u3067\u304f\u3060\u3055\u3044\uff081-4\u30ad\u30fc\u5bfe\u5fdc\uff09"}
        </span>
        <span>
          {"\u6b63\u89e3 "}
          {knownCards.length}
          {" \u30fb \u4e0d\u6b63\u89e3 "}
          {unknownCards.length}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="w-full max-w-3xl rounded-[var(--md-shape-lg)] border border-border/70 bg-card p-5 shadow-[var(--md-elevation-2)]">
          <div className="mb-3 flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {currentCard.tag}
            </Badge>
            <span className="text-xs text-[color:var(--md-sys-color-on-surface-variant)]">
              {"\u554f\u984c"}
            </span>
          </div>

          <p className="mb-4 text-base leading-relaxed text-foreground md:text-lg">
            {currentCard.question}
          </p>

          <div className="space-y-2">
            {currentCard.choices.map((choice, index) => {
              const isSelected = selectedChoice === index;
              const isCorrect = index === currentCard.correctIndex;

              let stateClass =
                "border-border/70 bg-[color:var(--md-sys-color-surface-container-low)] hover:bg-[color:var(--md-sys-color-surface-container)]";
              if (answered && isCorrect) {
                stateClass = "border-emerald-500/60 bg-emerald-500/12";
              } else if (answered && isSelected && !isCorrect) {
                stateClass = "border-destructive/60 bg-destructive/10";
              } else if (answered) {
                stateClass = "border-border/50 bg-[color:var(--md-sys-color-surface-container-low)] opacity-75";
              }

              return (
                <button
                  type="button"
                  key={`${choice}-${index}`}
                  onClick={() => selectChoice(index)}
                  disabled={answered}
                  className={`flex w-full items-start gap-3 rounded-[var(--md-shape-md)] border px-3 py-3 text-left transition-colors ${stateClass}`}
                >
                  <span className="mt-0.5 text-sm font-semibold text-[color:var(--md-sys-color-on-surface-variant)]">
                    {CHOICE_LABELS[index] ?? String(index + 1)}.
                  </span>
                  <span className="flex-1 text-sm leading-relaxed text-foreground">
                    {choice}
                  </span>
                  {answered && isCorrect ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : answered && isSelected ? (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--md-sys-color-outline)]" />
                  )}
                </button>
              );
            })}
          </div>

          {currentResult && (
            <div className="mt-4 rounded-[var(--md-shape-md)] border border-border/70 bg-[color:var(--md-sys-color-surface-container-low)] p-4">
              <p
                className={`text-sm font-semibold ${
                  currentResult.isCorrect ? "text-emerald-700" : "text-destructive"
                }`}
              >
                {currentResult.isCorrect
                  ? "\u6b63\u89e3\uff01"
                  : "\u4e0d\u6b63\u89e3"}
              </p>
              <p className="mt-1 text-sm text-foreground">
                {"\u6b63\u89e3: "}
                {currentResult.correctText}
              </p>
              {!currentResult.isCorrect && (
                <p className="mt-1 text-sm text-foreground">
                  {"\u3042\u306a\u305f\u306e\u56de\u7b54: "}
                  {currentResult.selectedText}
                </p>
              )}
              <div className="mt-3 border-t border-border/70 pt-3">
                <p className="mb-1 text-[11px] font-semibold tracking-wide text-[color:var(--md-sys-color-on-surface-variant)]">
                  {"\u89e3\u8aac"}
                </p>
                <p className="text-sm leading-relaxed text-foreground">
                  {currentCard.explanation}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end">
        <Button onClick={goNext} disabled={!answered}>
          {cursor + 1 >= total
            ? "\u7d42\u4e86"
            : "\u6b21\u3078"}
        </Button>
      </div>
    </div>
  );
}
