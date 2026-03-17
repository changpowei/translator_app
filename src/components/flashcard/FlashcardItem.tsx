"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TtsButton } from "@/components/translation/TtsButton";
import { Check, X, CircleHelp } from "lucide-react";
import type { Vocabulary } from "@/lib/supabase/types";
import type { QuizState, FlashcardMode } from "@/hooks/useFlashcards";

interface FlashcardItemProps {
  readonly card: Vocabulary;
  readonly isFlipped: boolean;
  readonly mode: FlashcardMode;
  readonly quiz: QuizState | null;
  readonly streak: number;
  readonly autoRemoveThreshold: number;
  readonly onClick: () => void;
  readonly onAnswerQuiz: (optionIndex: number) => void;
  readonly onForgot: () => void;
}

function QuizOptions({
  quiz,
  onAnswer,
}: {
  readonly quiz: QuizState;
  readonly onAnswer: (i: number) => void;
}) {
  const hasAnswered =
    quiz.selectedOption !== null && quiz.selectedOption !== undefined;

  return (
    <div className="grid gap-1">
      {quiz.options.map((option, i) => {
        const isSelected = quiz.selectedOption === i;
        const isCorrectOption = i === quiz.correctIndex;

        let className =
          "h-auto min-h-[26px] w-full justify-start px-2.5 py-0.5 text-[11px] text-left";

        if (hasAnswered) {
          if (isCorrectOption) {
            className +=
              " border-green-500 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300";
          } else if (isSelected) {
            className +=
              " border-red-300 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300";
          } else {
            className += " opacity-40";
          }
        } else {
          className += " hover:bg-accent/50";
        }

        return (
          <Button
            key={i}
            variant="outline"
            className={className}
            onClick={(e) => {
              e.stopPropagation();
              onAnswer(i);
            }}
            disabled={hasAnswered}
          >
            <span className="mr-1.5 font-mono text-[9px] opacity-50">
              {String.fromCharCode(65 + i)}
            </span>
            <span className="flex-1 truncate">{option}</span>
            {hasAnswered && isCorrectOption && (
              <Check className="ml-1 h-3 w-3 shrink-0 text-green-600" />
            )}
            {hasAnswered && isSelected && !isCorrectOption && (
              <X className="ml-1 h-3 w-3 shrink-0 text-red-500" />
            )}
          </Button>
        );
      })}
    </div>
  );
}

function QuizFeedback({
  quiz,
  streak,
  autoRemoveThreshold,
}: {
  readonly quiz: QuizState;
  readonly streak: number;
  readonly autoRemoveThreshold: number;
}) {
  const hasAnswered =
    quiz.selectedOption !== null && quiz.selectedOption !== undefined;
  if (!hasAnswered) return null;

  return (
    <div className="text-center">
      {quiz.isCorrect ? (
        <p className="text-[11px] text-green-600">
          ✓ 正確！
          {streak + 1 >= autoRemoveThreshold && (
            <span className="ml-1 text-amber-600">
              已精熟移除
            </span>
          )}
        </p>
      ) : (
        <p className="text-[11px] text-red-500">
          ✗ 正確答案：{quiz.options[quiz.correctIndex]}
        </p>
      )}
    </div>
  );
}

export function FlashcardItem({
  card,
  isFlipped,
  mode,
  quiz,
  streak,
  autoRemoveThreshold,
  onClick,
  onAnswerQuiz,
  onForgot,
}: FlashcardItemProps) {
  const isQuizMode = mode === "quiz";
  const hasQuizOptions = quiz && quiz.options.length > 0;
  const quizNotAnswered = quiz?.selectedOption === null;

  return (
    <div className="select-none" style={{ perspective: "800px" }}>
      <motion.div
        className="relative w-full"
        style={{
          transformStyle: "preserve-3d",
          height: isQuizMode && hasQuizOptions
            ? `${80 + quiz.options.length * 30}px`
            : "200px",
        }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: "easeInOut" }}
      >
        {/* ===== FRONT ===== */}
        <div
          className="absolute inset-0 flex flex-col rounded-xl border border-border/50 bg-card p-3 shadow-sm"
          style={{ backfaceVisibility: "hidden" }}
          onClick={isQuizMode ? undefined : onClick}
        >
          {isQuizMode && hasQuizOptions ? (
            /* Quiz mode front: word + options */
            <div className="flex h-full flex-col">
              {/* Header row: word + forgot icon */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-lg font-bold tracking-tight">
                    {card.word}
                  </h2>
                  <TtsButton
                    text={card.word}
                    lang={/[\u4e00-\u9fff]/.test(card.word) ? "zh" : "en"}
                  />
                  {streak > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-[9px] text-green-600"
                    >
                      {streak}/{autoRemoveThreshold}
                    </Badge>
                  )}
                </div>
                {quizNotAnswered && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                    title="忘記了"
                    onClick={(e) => {
                      e.stopPropagation();
                      onForgot();
                    }}
                  >
                    <CircleHelp className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-center text-[10px] text-muted-foreground mt-0.5 mb-1">
                請選擇正確的翻譯
              </p>
              <div className="flex-1">
                <QuizOptions quiz={quiz} onAnswer={onAnswerQuiz} />
              </div>
              <QuizFeedback
                quiz={quiz}
                streak={streak}
                autoRemoveThreshold={autoRemoveThreshold}
              />
            </div>
          ) : (
            /* Standard mode front: word only */
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight cursor-pointer">
                {card.word}
              </h2>
              <div className="flex items-center gap-1.5">
                <TtsButton
                  text={card.word}
                  lang={/[\u4e00-\u9fff]/.test(card.word) ? "zh" : "en"}
                />
                <Badge variant="outline" className="text-[10px]">
                  x{card.query_count}
                </Badge>
                {streak > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] text-green-600"
                  >
                    {streak}/{autoRemoveThreshold}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                點擊翻面
                <kbd className="ml-1 rounded border border-border/60 bg-muted/50 px-1 py-0.5 text-[9px]">
                  Space
                </kbd>
              </p>
            </div>
          )}
        </div>

        {/* ===== BACK ===== */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl border border-border/50 bg-card p-4 shadow-sm"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <h2 className="text-xl font-bold text-center">
            {card.translation}
          </h2>
          <TtsButton
            text={card.translation}
            lang={/[\u4e00-\u9fff]/.test(card.translation) ? "zh" : "en"}
          />
          <Badge variant="secondary" className="text-[10px]">
            熟悉度 {Math.round(card.familiarity_score * 100)}%
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            x{card.query_count}
          </Badge>
        </div>
      </motion.div>
    </div>
  );
}
