import { NextRequest } from "next/server";
import { GET, PATCH, POST } from "@/app/api/flashcards/route";

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

jest.mock("@/lib/vocabulary/repository", () => ({
  getWeightedFlashcards: jest.fn(),
  updateFamiliarity: jest.fn(),
  incrementQuizCorrect: jest.fn(),
  deleteWord: jest.fn(),
}));

jest.mock("@/lib/vocabulary/spaced-repetition", () => ({
  calculateNewFamiliarity: jest.fn(
    (_current: number, rating: number) => rating * 0.2
  ),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { getAuthFromRequest } from "@/lib/supabase/auth-helpers";
import {
  getWeightedFlashcards,
  updateFamiliarity,
  incrementQuizCorrect,
  deleteWord,
} from "@/lib/vocabulary/repository";

const mockGetAuth = getAuthFromRequest as jest.MockedFunction<
  typeof getAuthFromRequest
>;
const mockGetFlashcards = getWeightedFlashcards as jest.MockedFunction<
  typeof getWeightedFlashcards
>;
const mockUpdateFamiliarity = updateFamiliarity as jest.MockedFunction<
  typeof updateFamiliarity
>;
const mockIncrementQuiz = incrementQuizCorrect as jest.MockedFunction<
  typeof incrementQuizCorrect
>;
const mockDeleteWord = deleteWord as jest.MockedFunction<typeof deleteWord>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGetRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/flashcards", {
    method: "GET",
    headers: { Authorization: "Bearer valid-token" },
  });
}

function makePatchRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/flashcards", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
    },
    body: JSON.stringify(body),
  });
}

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/flashcards", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
    },
    body: JSON.stringify(body),
  });
}

const SAMPLE_CARD = {
  id: "card-1",
  user_id: "user-1",
  word: "hello",
  translation: "你好",
  query_count: 3,
  familiarity_score: 0.5,
  quiz_correct_count: 1,
  created_at: "2026-03-17T00:00:00Z",
  updated_at: "2026-03-17T00:00:00Z",
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAuth.mockResolvedValue({
    userId: "user-1",
    accessToken: "valid-token",
  });
});

// ── GET /api/flashcards ───────────────────────────────────────────────────

describe("GET /api/flashcards", () => {
  it("未認證時回傳 401", async () => {
    const { NextResponse } = await import("next/server");
    mockGetAuth.mockResolvedValue(
      NextResponse.json({ error: "請先登入" }, { status: 401 })
    );

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("成功取得加權排序的單字卡", async () => {
    mockGetFlashcards.mockResolvedValue([SAMPLE_CARD]);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].word).toBe("hello");
  });

  it("資料庫錯誤時回傳 500", async () => {
    mockGetFlashcards.mockRejectedValue(new Error("DB connection failed"));

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.error).toContain("Failed to load");
  });
});

// ── PATCH /api/flashcards ─────────────────────────────────────────────────

describe("PATCH /api/flashcards", () => {
  it("缺少 wordId 時回傳 400", async () => {
    const res = await PATCH(
      makePatchRequest({ rating: 3, currentScore: 0.5 })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("wordId");
  });

  it("rating 不在 1-5 範圍時回傳 400", async () => {
    const res = await PATCH(
      makePatchRequest({ wordId: "card-1", rating: 6, currentScore: 0.5 })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("rating");
  });

  it("rating 為 0 時回傳 400", async () => {
    const res = await PATCH(
      makePatchRequest({ wordId: "card-1", rating: 0, currentScore: 0.5 })
    );

    expect(res.status).toBe(400);
  });

  it("成功更新 familiarity_score", async () => {
    const updated = { ...SAMPLE_CARD, familiarity_score: 0.8 };
    mockUpdateFamiliarity.mockResolvedValue(updated);

    const res = await PATCH(
      makePatchRequest({ wordId: "card-1", rating: 4, currentScore: 0.5 })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.familiarity_score).toBe(0.8);
    expect(mockUpdateFamiliarity).toHaveBeenCalledWith(
      "valid-token",
      "card-1",
      expect.any(Number)
    );
  });

  it("找不到單字時回傳 404", async () => {
    mockUpdateFamiliarity.mockResolvedValue(null);

    const res = await PATCH(
      makePatchRequest({ wordId: "nonexistent", rating: 3, currentScore: 0.5 })
    );

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("not found");
  });
});

// ── POST /api/flashcards — quiz-correct ───────────────────────────────────

describe("POST /api/flashcards — quiz-correct", () => {
  it("缺少 wordId 時回傳 400", async () => {
    const res = await POST(
      makePostRequest({ action: "quiz-correct" })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("wordId");
  });

  it("答對後更新 quiz_correct_count", async () => {
    const updated = { ...SAMPLE_CARD, quiz_correct_count: 2 };
    mockIncrementQuiz.mockResolvedValue({ word: updated, deleted: false });

    const res = await POST(
      makePostRequest({ action: "quiz-correct", wordId: "card-1" })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.quiz_correct_count).toBe(2);
  });

  it("連續答對達到門檻時自動刪除單字", async () => {
    mockIncrementQuiz.mockResolvedValue({ word: null, deleted: true });

    const res = await POST(
      makePostRequest({ action: "quiz-correct", wordId: "card-1" })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.deleted).toBe(true);
  });

  it("找不到單字時回傳 404", async () => {
    mockIncrementQuiz.mockResolvedValue({ word: null, deleted: false });

    const res = await POST(
      makePostRequest({ action: "quiz-correct", wordId: "nonexistent" })
    );

    expect(res.status).toBe(404);
  });
});

// ── POST /api/flashcards — delete ─────────────────────────────────────────

describe("POST /api/flashcards — delete", () => {
  it("成功刪除單字", async () => {
    mockDeleteWord.mockResolvedValue(true);

    const res = await POST(
      makePostRequest({ action: "delete", wordId: "card-1" })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.deleted).toBe(true);
    expect(mockDeleteWord).toHaveBeenCalledWith("valid-token", "card-1");
  });

  it("刪除失敗時回傳 500", async () => {
    mockDeleteWord.mockResolvedValue(false);

    const res = await POST(
      makePostRequest({ action: "delete", wordId: "card-1" })
    );

    expect(res.status).toBe(500);
  });
});

// ── POST /api/flashcards — unknown action ─────────────────────────────────

describe("POST /api/flashcards — 未知 action", () => {
  it("未知 action 時回傳 400", async () => {
    const res = await POST(
      makePostRequest({ action: "unknown-action", wordId: "card-1" })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Unknown action");
  });
});
