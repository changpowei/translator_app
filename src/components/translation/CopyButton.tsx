"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopyButtonProps {
  readonly text: string;
  readonly size?: "sm" | "default";
}

export function CopyButton({ text, size = "sm" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  }, [text]);

  return (
    <Button
      variant="ghost"
      size={size === "sm" ? "icon" : "default"}
      onClick={handleCopy}
      className="h-8 w-8 shrink-0"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}
