import { NextRequest } from "next/server";
import { POST } from "@/app/api/translate/route";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("@/lib/supabase/auth-helpers", () => ({
  getAuthFromRequest: jest.fn(),
  isAuthError: jest.fn(
    (result: unknown) =>
      result !== null &&
      typeof result === "object" &&
      "status" in (result as Record<string, unknown>)
  ),
}));

jest.mock("@/lib/rate-limiter", () => ({
  isRateLimited: jest.fn(() => false),
  INPUT_MAX_LENGTH: 500,
}));

jest.mock("@/lib/gemini/client", () => ({
  getGeminiModel: jest.fn(),
  MODEL_FALLBACK_CHAIN: ["model-a", "model-b"],
  isFallbackableError: jest.fn(() => false),
}));

jest.mock("@/lib/gemini/prompts", () => ({
  buildSystemInstruction: jest.fn(() => "system-instruction"),
  buildUserPrompt: jest.fn((text: string) => `translate: ${text}`),
}));

jest.mock("@/lib/gemini/parse", () => ({
  extractJson: jest.fn((text: string) => text),
}));

jest.mock("@/lib/gemini/errors", () => {
  class TranslationError extends Error {
    statusCode: number;
    userMessage: string;
    constructor(msg: string, code: number, userMsg: string) {
      super(msg);
      this.statusCode = code;
      this.userMessage = userMsg;
    }
  }
  class MalformedResponseError extends TranslationError {
    constructor() {
      super("Malformed", 502, "AI 回應格式錯誤，請重新嘗試。");
    }
  }
  return {
    TranslationError,
    MalformedResponseError,
    classifyGeminiError: jest.fn((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("rate limit")) {
        return { statusCode: 429, userMessage: "請求太頻繁，請稍後再試。" };
      }
      return { statusCode: 500, userMessage: "翻譯失敗，請重新嘗試。" };
    }),
  };
});

jest.mock("@/lib/vocabulary/repository", () => ({
  getWeightedRandomWords: jest.fn(() => Promise.resolve([])),
  upsertWord: jest.fn(() => Promise.resolve(null)),
  upsertWords: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/lib/vocabulary/word-filter", () => ({
  isWordOrPhrase: jest.fn(() => true),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { getAuthFromRequest } from "@/lib/supabase/auth-helpers";
import { isRateLimited } from "@/lib/rate-limiter";
import { getGeminiModel, isFallbackableError } from "@/lib/gemini/client";
import { getWeightedRandomWords, upsertWord } from "@/lib/vocabulary/repository";
import { isWordOrPhrase } from "@/lib/vocabulary/word-filter";

const mockGetAuth = getAuthFromRequest as jest.MockedFunction<
  typeof getAuthFromRequest
>;
const mockIsRateLimited = isRateLimited as jest.MockedFunction<
  typeof isRateLimited
>;
const mockGetGeminiModel = getGeminiModel as jest.MockedFunction<
  typeof getGeminiModel
>;
const mockIsFallbackable = isFallbackableError as jest.MockedFunction<
  typeof isFallbackableError
>;
const mockGetWeightedWords = getWeightedRandomWords as jest.MockedFunction<
  typeof getWeightedRandomWords
>;
const mockUpsertWord = upsertWord as jest.MockedFunction<typeof upsertWord>;
const mockIsWordOrPhrase = isWordOrPhrase as jest.MockedFunction<
  typeof isWordOrPhrase
>;

/** 建立一個帶有 JSON body 的 NextRequest */
function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
    },
    body: JSON.stringify(body),
  });
}

/** 模擬 Gemini 回傳正常的翻譯結果 */
function mockGeminiSuccess(parsed: Record<string, unknown>) {
  const generateContent = jest.fn().mockResolvedValue({
    response: { text: () => JSON.stringify(parsed) },
  });
  mockGetGeminiModel.mockReturnValue({ generateContent } as never);
}

/** 完整的 Gemini 回應範本 */
const FULL_RESPONSE = {
  translation: "你好",
  phonetic: "nǐ hǎo",
  detected_language: "en",
  pos_entries: [
    {
      part_of_speech: "interjection",
      meanings: [
        {
          definition_en: "hello",
          definition_zh: "你好",
          examples: [{ en: "Hello!", zh: "你好！" }],
        },
      ],
    },
  ],
  example_sentences: [{ en: "Hello world", zh: "你好世界" }],
  synonyms: ["hi"],
  antonyms: [],
  confusable_words: [],
  reinforced_words: [],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  // 預設：認證通過
  mockGetAuth.mockResolvedValue({
    userId: "user-1",
    accessToken: "valid-token",
  });
  // 預設：速率限制未觸發
  mockIsRateLimited.mockReturnValue(false);
  // 預設：isWordOrPhrase 回傳 true
  mockIsWordOrPhrase.mockReturnValue(true);
  // 預設：過去單字為空
  mockGetWeightedWords.mockResolvedValue([]);
  // 預設：upsertWord 成功
  mockUpsertWord.mockResolvedValue(null);
});

// ── 認證流程 ──────────────────────────────────────────────────────────────

describe("POST /api/translate — 認證", () => {
  it("缺少 Authorization header 時回傳 401", async () => {
    const { NextResponse } = await import("next/server");
    const errorResponse = NextResponse.json(
      { error: "請先登入" },
      { status: 401 }
    );
    mockGetAuth.mockResolvedValue(errorResponse);

    const req = makeRequest({ text: "hello" });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("請先登入");
  });

  it("Token 過期時回傳 401", async () => {
    const { NextResponse } = await import("next/server");
    const errorResponse = NextResponse.json(
      { error: "登入已過期，請重新登入" },
      { status: 401 }
    );
    mockGetAuth.mockResolvedValue(errorResponse);

    const req = makeRequest({ text: "hello" });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("登入已過期，請重新登入");
  });
});

// ── 速率限制 ──────────────────────────────────────────────────────────────

describe("POST /api/translate — 速率限制", () => {
  it("IP 超過限制時回傳 429", async () => {
    mockIsRateLimited.mockReturnValue(true);

    const req = makeRequest({ text: "hello" });
    const res = await POST(req);

    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toContain("請求太頻繁");
  });
});

// ── 輸入驗證 ──────────────────────────────────────────────────────────────

describe("POST /api/translate — 輸入驗證", () => {
  it("缺少 text 欄位時回傳 400", async () => {
    const req = makeRequest({});
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("請輸入");
  });

  it("空字串時回傳 400", async () => {
    const req = makeRequest({ text: "   " });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("請輸入");
  });

  it("超過 500 字元時回傳 400", async () => {
    const req = makeRequest({ text: "a".repeat(501) });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("500");
  });
});

// ── Gemini 生成 ───────────────────────────────────────────────────────────

describe("POST /api/translate — Gemini 生成", () => {
  it("第一個模型成功時回傳翻譯結果", async () => {
    mockGeminiSuccess(FULL_RESPONSE);

    const req = makeRequest({ text: "hello" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.translation).toBe("你好");
    expect(data.detected_language).toBe("en");
  });

  it("第一個模型被限速時使用備援模型", async () => {
    const rateLimitError = new Error("429 rate limit");
    const successResponse = {
      response: { text: () => JSON.stringify(FULL_RESPONSE) },
    };

    let callCount = 0;
    const generateContent = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.reject(rateLimitError);
      return Promise.resolve(successResponse);
    });
    mockGetGeminiModel.mockReturnValue({ generateContent } as never);
    mockIsFallbackable.mockReturnValue(true);

    const req = makeRequest({ text: "hello" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    // getGeminiModel 應被呼叫 2 次（model-a 和 model-b）
    expect(mockGetGeminiModel).toHaveBeenCalledTimes(2);
  });

  it("所有模型用盡時回傳錯誤", async () => {
    const rateLimitError = new Error("429 rate limit");
    const generateContent = jest.fn().mockRejectedValue(rateLimitError);
    mockGetGeminiModel.mockReturnValue({ generateContent } as never);
    mockIsFallbackable.mockReturnValue(true);

    const req = makeRequest({ text: "hello" });
    const res = await POST(req);

    expect(res.status).toBe(429);
  });

  it("非速率限制錯誤時不做備援，直接回傳錯誤", async () => {
    const unknownError = new Error("some unknown error");
    const generateContent = jest.fn().mockRejectedValue(unknownError);
    mockGetGeminiModel.mockReturnValue({ generateContent } as never);
    mockIsFallbackable.mockReturnValue(false);

    const req = makeRequest({ text: "hello" });
    const res = await POST(req);

    expect(res.status).toBe(500);
    // 只嘗試了第一個模型
    expect(mockGetGeminiModel).toHaveBeenCalledTimes(1);
  });
});

// ── 回應正規化 ────────────────────────────────────────────────────────────

describe("POST /api/translate — 回應正規化", () => {
  it("缺少 pos_entries 時回傳空陣列", async () => {
    mockGeminiSuccess({
      translation: "你好",
      detected_language: "en",
      // pos_entries 缺失
    });

    const req = makeRequest({ text: "hello" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.pos_entries).toEqual([]);
  });

  it("example_sentence（單數）退路為陣列", async () => {
    mockGeminiSuccess({
      translation: "你好",
      detected_language: "en",
      example_sentences: [],
      example_sentence: "Hi there",
    });

    const req = makeRequest({ text: "hello" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.example_sentences).toHaveLength(1);
    // fallback 路徑：{ en: parsed.example_sentence, zh: "" }
    expect(data.example_sentences[0].en).toBe("Hi there");
    expect(data.example_sentences[0].zh).toBe("");
  });

  it("缺少 synonyms 和 antonyms 時回傳空陣列", async () => {
    mockGeminiSuccess({
      translation: "你好",
      detected_language: "en",
      // synonyms, antonyms 缺失
    });

    const req = makeRequest({ text: "hello" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.synonyms).toEqual([]);
    expect(data.antonyms).toEqual([]);
  });

  it("correction.has_error = false 時不包含 correction", async () => {
    mockGeminiSuccess({
      translation: "你好",
      detected_language: "en",
      correction: { has_error: false },
    });

    const req = makeRequest({ text: "hello" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.correction).toBeUndefined();
  });

  it("correction.has_error = true 時包含完整修正資訊", async () => {
    mockGeminiSuccess({
      translation: "你好",
      detected_language: "en",
      correction: {
        has_error: true,
        original: "helo",
        corrected: "hello",
        explanation: "拼字錯誤",
      },
    });

    const req = makeRequest({ text: "helo" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.correction).toBeDefined();
    expect(data.correction.corrected).toBe("hello");
  });

  it("缺少 usage_context.title 時不包含 usage_context", async () => {
    mockGeminiSuccess({
      translation: "你好",
      detected_language: "en",
      usage_context: { content: "some content" }, // 缺少 title
    });

    const req = makeRequest({ text: "hello" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.usage_context).toBeUndefined();
  });
});

// ── 資料庫儲存 ────────────────────────────────────────────────────────────

describe("POST /api/translate — 資料庫儲存", () => {
  it("單字會呼叫 upsertWord 儲存", async () => {
    mockGeminiSuccess(FULL_RESPONSE);
    mockIsWordOrPhrase.mockReturnValue(true);

    const req = makeRequest({ text: "hello" });
    await POST(req);

    // upsertWord 是 fire-and-forget，驗證有被呼叫
    expect(mockUpsertWord).toHaveBeenCalledWith(
      "valid-token",
      "user-1",
      "hello",
      "你好"
    );
  });

  it("句子不會呼叫 upsertWord", async () => {
    mockGeminiSuccess(FULL_RESPONSE);
    mockIsWordOrPhrase.mockReturnValue(false);

    const req = makeRequest({ text: "hello world how are you" });
    await POST(req);

    expect(mockUpsertWord).not.toHaveBeenCalled();
  });
});

// ── 過去單字（reinforcement）──────────────────────────────────────────────

describe("POST /api/translate — 過去單字抽樣", () => {
  it("getWeightedRandomWords 失敗時仍正常翻譯", async () => {
    mockGetWeightedWords.mockRejectedValue(new Error("DB error"));
    mockGeminiSuccess(FULL_RESPONSE);

    const req = makeRequest({ text: "hello" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.translation).toBe("你好");
  });
});
