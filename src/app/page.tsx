"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TranslationInput } from "@/components/translation/TranslationInput";
import { TranslationResult } from "@/components/translation/TranslationResult";
import { TranslationSkeleton } from "@/components/translation/TranslationSkeleton";
import { FlashcardDeck } from "@/components/flashcard/FlashcardDeck";
import { useTranslation } from "@/hooks/useTranslation";
import { useFlashcards } from "@/hooks/useFlashcards";
import { useAuth } from "@/components/auth/AuthProvider";

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  const { input, result, isLoading, error, setInput, translate, clear } =
    useTranslation();
  const flashcards = useFlashcards();

  const handleWordClick = useCallback(
    (word: string) => {
      setInput(word);
      setTimeout(() => translate(), 100);
    },
    [setInput, translate]
  );

  // Refresh flashcards when a translation completes (new words may have been added)
  useEffect(() => {
    if (result && !isLoading) {
      const timer = setTimeout(() => flashcards.fetchCards(), 1500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, isLoading]);

  // Keyboard shortcuts for flashcards
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't intercept if user is typing in textarea or button
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          flashcards.flip();
          break;
        case "ArrowLeft":
          flashcards.previous();
          break;
        case "ArrowRight":
          flashcards.next();
          break;
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
          if (flashcards.isFlipped) {
            flashcards.rate(Number(e.key) as 1 | 2 | 3 | 4 | 5);
          }
          break;
        case "Delete":
        case "Backspace":
          if (e.target === document.body) {
            e.preventDefault();
            flashcards.removeCard();
          }
          break;
      }
    },
    [flashcards]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Show loading while checking auth
  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,340px]">
      {/* Left: Translation */}
      <div className="space-y-4">
        <TranslationInput
          value={input}
          onChange={setInput}
          onSubmit={translate}
          onClear={clear}
          isLoading={isLoading}
        />

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {isLoading && <TranslationSkeleton />}
        {result && !isLoading && (
          <TranslationResult result={result} onWordClick={handleWordClick} />
        )}
      </div>

      {/* Right: Flashcards with integrated quiz */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">單字卡複習</h2>
          <p className="text-[10px] text-muted-foreground">
            Space 翻面 / 方向鍵切換 / 1-5 評分
          </p>
        </div>

        {flashcards.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : flashcards.error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
            {flashcards.error}
          </div>
        ) : (
          <FlashcardDeck
            cards={flashcards.cards}
            currentCard={flashcards.currentCard}
            currentIndex={flashcards.currentIndex}
            isFlipped={flashcards.isFlipped}
            mode={flashcards.mode}
            quiz={flashcards.quiz}
            currentStreak={flashcards.currentStreak}
            autoRemoveThreshold={flashcards.autoRemoveThreshold}
            onFlip={flashcards.flip}
            onNext={flashcards.next}
            onPrevious={flashcards.previous}
            onRate={flashcards.rate}
            onAnswerQuiz={flashcards.answerQuiz}
            onForgot={flashcards.forgot}
            onRemoveCard={() => flashcards.removeCard()}
            onToggleMode={flashcards.toggleMode}
            onShuffle={flashcards.shuffle}
            onRefresh={flashcards.fetchCards}
          />
        )}
      </div>
    </div>
  );
}
