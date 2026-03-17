"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, X } from "lucide-react";
import { TtsButton } from "./TtsButton";

interface TranslationInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly onClear: () => void;
  readonly isLoading: boolean;
}

export function TranslationInput({
  value,
  onChange,
  onSubmit,
  onClear,
  isLoading,
}: TranslationInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="輸入中文或英文，按 Enter 翻譯..."
          className="min-h-[80px] resize-none pr-10 text-[15px]"
          disabled={isLoading}
          maxLength={500}
        />
        {value && (
          <button
            onClick={onClear}
            className="absolute right-2.5 top-2.5 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Clear input"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {value.length}/500
          </span>
          {value.trim() && (
            <TtsButton
              text={value.trim()}
              lang={/[\u4e00-\u9fff]/.test(value) ? "zh" : "en"}
            />
          )}
        </div>
        <Button
          onClick={onSubmit}
          disabled={!value.trim() || isLoading}
          size="sm"
          className="h-8 px-3 text-xs"
        >
          {isLoading ? (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              翻譯中
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Send className="h-3 w-3" />
              翻譯
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
