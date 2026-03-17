export class TranslationError extends Error {
  readonly statusCode: number;
  readonly userMessage: string;

  constructor(message: string, statusCode: number, userMessage: string) {
    super(message);
    this.name = "TranslationError";
    this.statusCode = statusCode;
    this.userMessage = userMessage;
  }
}

export class RateLimitError extends TranslationError {
  constructor() {
    super(
      "Gemini API rate limit exceeded",
      429,
      "請求太頻繁，請稍後再試。"
    );
    this.name = "RateLimitError";
  }
}

export class QuotaExceededError extends TranslationError {
  constructor() {
    super(
      "Gemini API quota exceeded",
      429,
      "AI 服務配額已用完，請稍後再試。"
    );
    this.name = "QuotaExceededError";
  }
}

export class MalformedResponseError extends TranslationError {
  constructor() {
    super(
      "Gemini returned malformed JSON",
      502,
      "AI 回應格式錯誤，請重新嘗試。"
    );
    this.name = "MalformedResponseError";
  }
}

export class ApiUnavailableError extends TranslationError {
  constructor() {
    super(
      "Gemini API unavailable",
      503,
      "AI 服務暫時無法使用，請稍後再試。"
    );
    this.name = "ApiUnavailableError";
  }
}

export function classifyGeminiError(error: unknown): TranslationError {
  if (error instanceof TranslationError) return error;

  const message = error instanceof Error ? error.message : String(error);
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes("429") || lowerMsg.includes("rate limit")) {
    return new RateLimitError();
  }
  if (lowerMsg.includes("quota") || lowerMsg.includes("resource exhausted")) {
    return new QuotaExceededError();
  }
  if (lowerMsg.includes("timeout") || lowerMsg.includes("deadline")) {
    return new ApiUnavailableError();
  }

  return new TranslationError(
    message,
    500,
    "翻譯失敗，請重新嘗試。"
  );
}
