"use client";

import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Trash2,
  Layers,
  ListChecks,
  Shuffle,
} from "lucide-react";
import { FlashcardItem } from "./FlashcardItem";
import { FamiliarityRating } from "./FamiliarityRating";
import type { Vocabulary } from "@/lib/supabase/types";
import type { QuizState, FlashcardMode } from "@/hooks/useFlashcards";

interface FlashcardDeckProps {
  readonly cards: readonly Vocabulary[];
  readonly currentCard: Vocabulary | null;
  readonly currentIndex: number;
  readonly isFlipped: boolean;
  readonly mode: FlashcardMode;
  readonly quiz: QuizState | null;
  readonly currentStreak: number;
  readonly autoRemoveThreshold: number;
  readonly onFlip: () => void;
  readonly onNext: () => void;
  readonly onPrevious: () => void;
  readonly onRate: (rating: 1 | 2 | 3 | 4 | 5) => void;
  readonly onAnswerQuiz: (optionIndex: number) => void;
  readonly onForgot: () => void;
  readonly onRemoveCard: () => void;
  readonly onToggleMode: () => void;
  readonly onShuffle: () => void;
  readonly onRefresh: () => void;
}

export function FlashcardDeck({
  cards,
  currentCard,
  currentIndex,
  isFlipped,
  mode,
  quiz,
  currentStreak,
  autoRemoveThreshold,
  onFlip,
  onNext,
  onPrevious,
  onRate,
  onAnswerQuiz,
  onForgot,
  onRemoveCard,
  onToggleMode,
  onShuffle,
  onRefresh,
}: FlashcardDeckProps) {
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 py-12">
        <p className="text-sm text-muted-foreground">
          翻譯一些句子來建立單字庫
        </p>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RotateCcw className="mr-1.5 h-3 w-3" />
          重新載入
        </Button>
      </div>
    );
  }

  if (!currentCard) return null;

  const quizAnswered =
    quiz?.selectedOption !== null && quiz?.selectedOption !== undefined;

  // In standard mode: show rating after flip
  // In quiz mode: show rating after quiz answered AND flipped to back
  const showRating =
    mode === "standard"
      ? isFlipped
      : isFlipped && quizAnswered;

  return (
    <div className="space-y-3">
      {/* Progress bar + mode toggle */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {currentIndex + 1}/{cards.length}
        </span>
        <div className="h-1 flex-1 rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{
              width: `${((currentIndex + 1) / cards.length) * 100}%`,
            }}
          />
        </div>
        <Button
          variant={mode === "quiz" ? "default" : "ghost"}
          size="icon"
          onClick={onToggleMode}
          className="h-6 w-6"
          title={mode === "standard" ? "切換到選擇題模式" : "切換到標準模式"}
        >
          {mode === "standard" ? (
            <ListChecks className="h-3 w-3" />
          ) : (
            <Layers className="h-3 w-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onShuffle}
          className="h-6 w-6"
          title="隨機排序"
        >
          <Shuffle className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          className="h-6 w-6"
          title="重新載入"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>

      {/* Card */}
      <FlashcardItem
        card={currentCard}
        isFlipped={isFlipped}
        mode={mode}
        quiz={quiz}
        streak={currentStreak}
        autoRemoveThreshold={autoRemoveThreshold}
        onClick={onFlip}
        onAnswerQuiz={onAnswerQuiz}
        onForgot={onForgot}
      />

      {/* Rating */}
      <FamiliarityRating onRate={onRate} visible={showRating} />

      {/* Navigation + Remove */}
      <div className="flex items-center justify-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevious}
          className="h-8 w-8"
          title="上一張"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNext}
          className="h-8 w-8"
          title="下一張"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemoveCard}
          className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
          title="移除此單字（從資料庫刪除）"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
