"use client";

import { useState, useCallback, useEffect } from "react";
import { speak, isSupported } from "@/lib/tts";

export function useTts() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(isSupported());
  }, []);

  const play = useCallback((text: string, lang: "en" | "zh" = "en") => {
    speak(text, lang);
    setIsSpeaking(true);

    const handleEnd = () => setIsSpeaking(false);
    if (typeof window !== "undefined") {
      window.speechSynthesis.addEventListener("end", handleEnd);
      // Fallback timeout in case event doesn't fire
      const timeout = setTimeout(() => setIsSpeaking(false), 10000);
      return () => {
        clearTimeout(timeout);
        window.speechSynthesis.removeEventListener("end", handleEnd);
      };
    }
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  return { play, stop, isSpeaking, isSupported: supported };
}
