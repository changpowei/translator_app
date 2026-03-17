import type { Vocabulary } from "@/lib/supabase/types";

export function calculateWeight(
  queryCount: number,
  familiarityScore: number
): number {
  return queryCount * (1.0 - familiarityScore);
}

export function calculateNewFamiliarity(
  currentScore: number,
  rating: 1 | 2 | 3 | 4 | 5
): number {
  const adjustment = (rating - 3) * 0.15;
  const newScore = currentScore + adjustment;
  return Math.max(0.0, Math.min(1.0, newScore));
}

export function sortByWeight(
  words: readonly Vocabulary[]
): readonly Vocabulary[] {
  return [...words].sort((a, b) => {
    const weightA = calculateWeight(a.query_count, a.familiarity_score);
    const weightB = calculateWeight(b.query_count, b.familiarity_score);
    return weightB - weightA;
  });
}
