"use client";

import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTts } from "@/hooks/useTts";

interface TtsButtonProps {
  readonly text: string;
  readonly lang?: "en" | "zh";
  readonly size?: "sm" | "default";
}

export function TtsButton({ text, lang = "en", size = "sm" }: TtsButtonProps) {
  const { play, isSpeaking, isSupported } = useTts();

  if (!isSupported) return null;

  return (
    <Button
      variant="ghost"
      size={size === "sm" ? "icon" : "default"}
      onClick={() => play(text, lang)}
      disabled={isSpeaking}
      className="h-8 w-8 shrink-0"
      aria-label={`Play pronunciation for: ${text}`}
    >
      {isSpeaking ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </Button>
  );
}
