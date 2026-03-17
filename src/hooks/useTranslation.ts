"use client";

import { useState, useCallback, useRef } from "react";
import type { TranslationResponse } from "@/lib/gemini/types";
import { useAuth } from "@/components/auth/AuthProvider";

interface TranslationState {
  readonly input: string;
  readonly result: TranslationResponse | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

export function useTranslation() {
  const { session } = useAuth();
  const [state, setState] = useState<TranslationState>({
    input: "",
    result: null,
    isLoading: false,
    error: null,
  });

  const inputRef = useRef(state.input);

  const setInput = useCallback((input: string) => {
    inputRef.current = input;
    setState((prev) => ({ ...prev, input }));
  }, []);

  const translate = useCallback(async () => {
    const text = inputRef.current.trim();
    if (!text) return;

    if (!session?.access_token) {
      setState((prev) => ({ ...prev, error: "請先登入" }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "翻譯失敗");
      }

      const result: TranslationResponse = await res.json();
      setState((prev) => ({ ...prev, result, isLoading: false }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "翻譯失敗";
      setState((prev) => ({ ...prev, error: message, isLoading: false }));
    }
  }, [session]);

  const clear = useCallback(() => {
    inputRef.current = "";
    setState({ input: "", result: null, isLoading: false, error: null });
  }, []);

  return {
    input: state.input,
    result: state.result,
    isLoading: state.isLoading,
    error: state.error,
    setInput,
    translate,
    clear,
  };
}
