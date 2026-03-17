"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Vocabulary } from "@/lib/supabase/types";
import { useAuth } from "@/components/auth/AuthProvider";

/** Number of cumulative correct quiz answers before auto-removing a card */
const AUTO_REMOVE_THRESHOLD = 3;

export type FlashcardMode = "standard" | "quiz";

export interface QuizState {
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly selectedOption: number | null;
  readonly isCorrect: boolean | null;
}

/**
 * Detect if a word is Chinese (true) or English (false).
 */
function isChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

function generateQuizOptions(
  currentCard: Vocabulary,
  allCards: readonly Vocabulary[],
  optionCount: number
): { options: string[]; correctIndex: number } {
  const wordIsChinese = isChinese(currentCard.word);

  const correctAnswer = currentCard.translation;

  const others = allCards
    .filter((c) => c.id !== currentCard.id)
    .map((c) => {
      if (wordIsChinese) {
        return isChinese(c.translation) ? c.word : c.translation;
      } else {
        return isChinese(c.translation) ? c.translation : c.word;
      }
    })
    .filter((text) => text !== correctAnswer);

  // Deduplicate to avoid showing the same option twice
  const unique = [...new Set(others)];

  const shuffled = [...unique].sort(() => Math.random() - 0.5);
  const wrongCount = optionCount - 1;
  const wrongOptions = shuffled.slice(0, wrongCount);

  while (wrongOptions.length < wrongCount) {
    wrongOptions.push("—");
  }

  const correctIndex = Math.floor(Math.random() * optionCount);
  const options = [...wrongOptions];
  options.splice(correctIndex, 0, correctAnswer);

  return { options, correctIndex };
}

/**
 * Fisher-Yates shuffle (immutable).
 */
function shuffleArray<T>(arr: readonly T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function useFlashcards() {
  const { session } = useAuth();
  const [cards, setCards] = useState<readonly Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [mode, setMode] = useState<FlashcardMode>("standard");

  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
    return headers;
  }, [session]);

  const fetchCards = useCallback(async () => {
    if (!session?.access_token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/flashcards", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to load flashcards");
      const data: Vocabulary[] = await res.json();
      setCards(data);
      setCurrentIndex(0);
      setIsFlipped(false);
      setQuiz(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load flashcards";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const generateQuizForCurrentCard = useCallback(() => {
    const currentCards = cardsRef.current;
    const card = currentCards[currentIndex];
    if (!card || currentCards.length < 2) {
      setQuiz(null);
      return;
    }
    const maxOptions = Math.min(8, currentCards.length);
    const optionCount = Math.max(4, maxOptions);
    const { options, correctIndex } = generateQuizOptions(
      card,
      currentCards,
      optionCount
    );
    setQuiz({ options, correctIndex, selectedOption: null, isCorrect: null });
  }, [currentIndex]);

  useEffect(() => {
    if (mode === "quiz") {
      setIsFlipped(false);
      generateQuizForCurrentCard();
    } else {
      setQuiz(null);
      setIsFlipped(false);
    }
  }, [mode, currentIndex, generateQuizForCurrentCard]);

  const flip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const advanceCard = useCallback(() => {
    setIsFlipped(false);
    setQuiz(null);
    setCurrentIndex((prev) => {
      const len = cardsRef.current.length;
      return len > 0 ? (prev + 1) % len : 0;
    });
  }, []);

  const next = useCallback(() => {
    advanceCard();
  }, [advanceCard]);

  const previous = useCallback(() => {
    setIsFlipped(false);
    setQuiz(null);
    setCurrentIndex((prev) => {
      const len = cardsRef.current.length;
      return len > 0 ? (prev - 1 + len) % len : 0;
    });
  }, []);

  const shuffle = useCallback(() => {
    setCards((prev) => shuffleArray(prev));
    setCurrentIndex(0);
    setIsFlipped(false);
    setQuiz(null);
  }, []);

  const removeCardFromState = useCallback((cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setCurrentIndex((prev) => {
      const newLen = cardsRef.current.length - 1;
      if (newLen <= 0) return 0;
      return prev >= newLen ? 0 : prev;
    });
    setIsFlipped(false);
    setQuiz(null);
  }, []);

  const answerQuiz = useCallback(
    async (optionIndex: number) => {
      if (!quiz || quiz.selectedOption !== null) return;

      const currentCards = cardsRef.current;
      const card = currentCards[currentIndex];
      if (!card) return;

      const correct = optionIndex === quiz.correctIndex;

      setQuiz((prev) =>
        prev
          ? { ...prev, selectedOption: optionIndex, isCorrect: correct }
          : null
      );

      // Flip to back immediately (400ms delay for feedback), then auto-advance after 2s
      setTimeout(() => setIsFlipped(true), 400);

      let wasDeleted = false;

      // Auto-update familiarity: correct → rating 4 (+15%), wrong → rating 2 (-15%)
      const autoRating = correct ? 4 : 2;
      try {
        const famRes = await fetch("/api/flashcards", {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            wordId: card.id,
            rating: autoRating,
            currentScore: card.familiarity_score,
          }),
        });
        if (famRes.ok) {
          const updated = await famRes.json();
          setCards((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c))
          );
        }
      } catch {
        // Non-critical
      }

      if (correct) {
        // Increment quiz_correct_count in DB; server auto-deletes at threshold
        try {
          const res = await fetch("/api/flashcards", {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
              action: "quiz-correct",
              wordId: card.id,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.deleted) {
              wasDeleted = true;
            } else {
              setCards((prev) =>
                prev.map((c) => (c.id === card.id ? { ...c, ...data } : c))
              );
            }
          }
        } catch {
          // Non-critical
        }
      }

      // Auto-advance to next card after 3 seconds
      setTimeout(() => {
        if (wasDeleted) {
          removeCardFromState(card.id);
        } else {
          advanceCard();
        }
      }, 3000);
    },
    [quiz, currentIndex, removeCardFromState, advanceCard, getAuthHeaders]
  );

  const removeCard = useCallback(
    async (cardId?: string) => {
      const currentCards = cardsRef.current;
      const card = cardId
        ? currentCards.find((c) => c.id === cardId)
        : currentCards[currentIndex];
      if (!card) return;

      try {
        await fetch("/api/flashcards", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            action: "delete",
            wordId: card.id,
          }),
        });
      } catch {
        // Non-critical
      }

      removeCardFromState(card.id);
    },
    [currentIndex, removeCardFromState, getAuthHeaders]
  );

  const rate = useCallback(
    async (rating: 1 | 2 | 3 | 4 | 5) => {
      const currentCards = cardsRef.current;
      const card = currentCards[currentIndex];
      if (!card) return;

      try {
        const res = await fetch("/api/flashcards", {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            wordId: card.id,
            rating,
            currentScore: card.familiarity_score,
          }),
        });

        if (res.ok) {
          const updated: Vocabulary = await res.json();
          setCards((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c))
          );
        }
      } catch {
        // Non-critical
      }

      setTimeout(() => {
        advanceCard();
      }, 300);
    },
    [currentIndex, advanceCard, getAuthHeaders]
  );

  /**
   * "忘記了" — mark as forgot (rating 1), flip to back, auto-advance after 3s.
   * This increases the word's weight so it appears more in example sentences.
   */
  const forgot = useCallback(async () => {
    const currentCards = cardsRef.current;
    const card = currentCards[currentIndex];
    if (!card) return;

    // Rate as 1 (forgot) to lower familiarity → higher reinforcement weight
    try {
      const res = await fetch("/api/flashcards", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          wordId: card.id,
          rating: 1,
          currentScore: card.familiarity_score,
        }),
      });

      if (res.ok) {
        const updated: Vocabulary = await res.json();
        setCards((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
      }
    } catch {
      // Non-critical
    }

    // Flip to back to show the answer
    setIsFlipped(true);

    // Auto-advance after 3 seconds
    setTimeout(() => {
      advanceCard();
    }, 3000);
  }, [currentIndex, advanceCard, getAuthHeaders]);

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "standard" ? "quiz" : "standard"));
  }, []);

  const currentCard = cards[currentIndex] ?? null;
  const currentStreak = currentCard?.quiz_correct_count ?? 0;

  return {
    cards,
    currentCard,
    currentIndex,
    isFlipped,
    isLoading,
    error,
    quiz,
    mode,
    currentStreak,
    autoRemoveThreshold: AUTO_REMOVE_THRESHOLD,
    flip,
    next,
    previous,
    shuffle,
    rate,
    answerQuiz,
    forgot,
    removeCard,
    toggleMode,
    fetchCards,
  };
}
