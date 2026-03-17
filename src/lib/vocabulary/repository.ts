import { createAuthenticatedClient } from "@/lib/supabase/server";
import { calculateWeight } from "@/lib/vocabulary/spaced-repetition";
import type { Vocabulary } from "@/lib/supabase/types";

function getClient(accessToken: string) {
  return createAuthenticatedClient(accessToken);
}

export async function upsertWord(
  accessToken: string,
  userId: string,
  word: string,
  translation: string
): Promise<Vocabulary | null> {
  const supabase = getClient(accessToken);

  const { data, error } = await supabase.rpc("upsert_vocabulary", {
    p_user_id: userId,
    word_text: word,
    word_translation: translation,
  });

  if (error) {
    console.error("Failed to upsert word:", error);
    return null;
  }
  return data;
}

export async function upsertWords(
  accessToken: string,
  userId: string,
  words: ReadonlyArray<{ readonly word: string; readonly translation: string }>
): Promise<void> {
  const supabase = getClient(accessToken);

  await Promise.all(
    words.map((w) =>
      supabase
        .rpc("upsert_vocabulary", {
          p_user_id: userId,
          word_text: w.word,
          word_translation: w.translation,
        })
        .then(({ error }) => {
          if (error) console.error(`Failed to upsert "${w.word}":`, error);
        })
    )
  );
}

export async function getHighFrequencyWords(
  accessToken: string,
  limit: number = 10
): Promise<readonly Vocabulary[]> {
  const supabase = getClient(accessToken);
  const { data, error } = await supabase
    .from("vocabulary")
    .select("*")
    .order("query_count", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch high frequency words:", error);
    return [];
  }
  return data ?? [];
}

/**
 * Weighted random sampling of words based on query_count.
 * Higher query_count = higher probability of being selected.
 * RLS ensures only the authenticated user's words are returned.
 */
export async function getWeightedRandomWords(
  accessToken: string,
  count: number = 5
): Promise<readonly Vocabulary[]> {
  const supabase = getClient(accessToken);
  const { data, error } = await supabase
    .from("vocabulary")
    .select("*")
    .gt("query_count", 0)
    .order("query_count", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Failed to fetch words for sampling:", error);
    return [];
  }

  const words = data ?? [];
  if (words.length === 0) return [];
  if (words.length <= count) return words;

  const totalWeight = words.reduce((sum, w) => sum + w.query_count, 0);
  const selected: Vocabulary[] = [];
  const usedIndices = new Set<number>();

  while (selected.length < count && usedIndices.size < words.length) {
    let rand = Math.random() * totalWeight;
    for (let i = 0; i < words.length; i++) {
      if (usedIndices.has(i)) continue;
      rand -= words[i].query_count;
      if (rand <= 0) {
        selected.push(words[i]);
        usedIndices.add(i);
        break;
      }
    }
  }

  return selected;
}

export async function getWeightedFlashcards(
  accessToken: string,
  limit: number = 20
): Promise<readonly Vocabulary[]> {
  const supabase = getClient(accessToken);
  const { data, error } = await supabase
    .from("vocabulary")
    .select("*")
    .order("query_count", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Failed to fetch flashcards:", error);
    return [];
  }

  const sorted = [...(data ?? [])].sort((a, b) => {
    const weightA = calculateWeight(a.query_count, a.familiarity_score);
    const weightB = calculateWeight(b.query_count, b.familiarity_score);
    return weightB - weightA;
  });

  return sorted.slice(0, limit);
}

export async function updateFamiliarity(
  accessToken: string,
  wordId: string,
  newScore: number
): Promise<Vocabulary | null> {
  const supabase = getClient(accessToken);
  const clamped = Math.max(0, Math.min(1, newScore));

  const { data, error } = await supabase
    .from("vocabulary")
    .update({ familiarity_score: clamped })
    .eq("id", wordId)
    .select()
    .single();

  if (error) {
    console.error("Failed to update familiarity:", error);
    return null;
  }
  return data;
}

/**
 * Increment quiz_correct_count by 1.
 * If it reaches the threshold (3), delete the word from DB.
 * Returns the updated word, or null if deleted or error.
 */
export async function incrementQuizCorrect(
  accessToken: string,
  wordId: string,
  autoRemoveThreshold: number = 3
): Promise<{ word: Vocabulary | null; deleted: boolean }> {
  const supabase = getClient(accessToken);

  const { data: current, error: fetchError } = await supabase
    .from("vocabulary")
    .select("quiz_correct_count")
    .eq("id", wordId)
    .single();

  if (fetchError || !current) {
    console.error("Failed to fetch word for quiz correct:", fetchError);
    return { word: null, deleted: false };
  }

  const newCount = current.quiz_correct_count + 1;

  if (newCount >= autoRemoveThreshold) {
    // Reached threshold — delete from DB
    const { error: delError } = await supabase
      .from("vocabulary")
      .delete()
      .eq("id", wordId);

    if (delError) {
      console.error("Failed to auto-delete word:", delError);
      return { word: null, deleted: false };
    }
    return { word: null, deleted: true };
  }

  const { data, error } = await supabase
    .from("vocabulary")
    .update({ quiz_correct_count: newCount })
    .eq("id", wordId)
    .select()
    .single();

  if (error) {
    console.error("Failed to increment quiz_correct_count:", error);
    return { word: null, deleted: false };
  }
  return { word: data, deleted: false };
}

/**
 * Delete a word from the database entirely.
 * Called when user manually removes a card or after consecutive correct quiz answers.
 */
export async function deleteWord(
  accessToken: string,
  wordId: string
): Promise<boolean> {
  const supabase = getClient(accessToken);

  const { error } = await supabase
    .from("vocabulary")
    .delete()
    .eq("id", wordId);

  if (error) {
    console.error("Failed to delete word:", error);
    return false;
  }
  return true;
}
