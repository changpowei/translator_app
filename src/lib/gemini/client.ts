import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

let instance: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  if (!instance) {
    instance = new GoogleGenerativeAI(apiKey);
  }
  return instance;
}

/**
 * Ordered model fallback chain.
 * Always starts from the first model; falls back on rate limit / quota errors.
 */
export const MODEL_FALLBACK_CHAIN = [
  "gemini-3.1-flash-lite-preview",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemma-3-27b-it",
  "gemma-3-12b-it",
  "gemma-3-4b-it",
  "gemma-3-1b-it",
] as const;

export function getGeminiModel(modelId?: string): GenerativeModel {
  return getClient().getGenerativeModel({
    model: modelId ?? MODEL_FALLBACK_CHAIN[0],
  });
}

/**
 * Check if an error is a rate limit or quota error that warrants model fallback.
 */
/**
 * Check if an error warrants falling back to the next model.
 * Includes rate limit, quota, and model-not-found errors.
 */
export function isFallbackableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMsg = message.toLowerCase();
  return (
    lowerMsg.includes("429") ||
    lowerMsg.includes("rate limit") ||
    lowerMsg.includes("quota") ||
    lowerMsg.includes("resource exhausted") ||
    lowerMsg.includes("too many requests") ||
    lowerMsg.includes("not found") ||
    lowerMsg.includes("404") ||
    lowerMsg.includes("is not supported") ||
    lowerMsg.includes("unavailable")
  );
}
