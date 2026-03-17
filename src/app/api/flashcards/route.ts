import { NextRequest, NextResponse } from "next/server";
import {
  getWeightedFlashcards,
  updateFamiliarity,
  incrementQuizCorrect,
  deleteWord,
} from "@/lib/vocabulary/repository";
import { calculateNewFamiliarity } from "@/lib/vocabulary/spaced-repetition";
import { getAuthFromRequest, isAuthError } from "@/lib/supabase/auth-helpers";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (isAuthError(auth)) return auth;

  try {
    const cards = await getWeightedFlashcards(auth.accessToken, 20);
    return NextResponse.json(cards);
  } catch (error) {
    console.error("Failed to fetch flashcards:", error);
    return NextResponse.json(
      { error: "Failed to load flashcards" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const { wordId, rating, currentScore } = body;

    if (!wordId || typeof wordId !== "string") {
      return NextResponse.json(
        { error: "wordId is required" },
        { status: 400 }
      );
    }

    if (![1, 2, 3, 4, 5].includes(rating)) {
      return NextResponse.json(
        { error: "rating must be 1-5" },
        { status: 400 }
      );
    }

    const score = typeof currentScore === "number" ? currentScore : 0;
    const newScore = calculateNewFamiliarity(score, rating);
    const updated = await updateFamiliarity(auth.accessToken, wordId, newScore);

    if (!updated) {
      return NextResponse.json(
        { error: "Word not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update flashcard:", error);
    return NextResponse.json(
      { error: "Failed to update familiarity" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const { action, wordId } = body;

    if (!wordId || typeof wordId !== "string") {
      return NextResponse.json(
        { error: "wordId is required" },
        { status: 400 }
      );
    }

    if (action === "quiz-correct") {
      const result = await incrementQuizCorrect(auth.accessToken, wordId);
      if (result.deleted) {
        return NextResponse.json({ deleted: true });
      }
      if (!result.word) {
        return NextResponse.json(
          { error: "Word not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(result.word);
    }

    if (action === "delete") {
      const success = await deleteWord(auth.accessToken, wordId);
      if (!success) {
        return NextResponse.json(
          { error: "Failed to delete word" },
          { status: 500 }
        );
      }
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json(
      { error: "Unknown action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to process quiz action:", error);
    return NextResponse.json(
      { error: "Failed to process quiz" },
      { status: 500 }
    );
  }
}
