import {
  calculateWeight,
  calculateNewFamiliarity,
  sortByWeight,
} from "@/lib/vocabulary/spaced-repetition";
import type { Vocabulary } from "@/lib/supabase/types";

describe("calculateWeight", () => {
  it("returns queryCount when familiarity is 0", () => {
    expect(calculateWeight(5, 0)).toBe(5);
  });

  it("returns 0 when familiarity is 1", () => {
    expect(calculateWeight(5, 1.0)).toBe(0);
  });

  it("returns 0 when queryCount is 0", () => {
    expect(calculateWeight(0, 0.5)).toBe(0);
  });

  it("calculates correctly for typical values", () => {
    expect(calculateWeight(10, 0.3)).toBeCloseTo(7.0);
    expect(calculateWeight(3, 0.5)).toBeCloseTo(1.5);
  });

  it("handles high query count with low familiarity", () => {
    expect(calculateWeight(100, 0.1)).toBeCloseTo(90);
  });
});

describe("calculateNewFamiliarity", () => {
  it("increases score for rating 5 (easy)", () => {
    const result = calculateNewFamiliarity(0.5, 5);
    expect(result).toBeCloseTo(0.8);
  });

  it("increases score for rating 4 (good)", () => {
    const result = calculateNewFamiliarity(0.5, 4);
    expect(result).toBeCloseTo(0.65);
  });

  it("keeps score same for rating 3 (ok)", () => {
    const result = calculateNewFamiliarity(0.5, 3);
    expect(result).toBeCloseTo(0.5);
  });

  it("decreases score for rating 2 (hard)", () => {
    const result = calculateNewFamiliarity(0.5, 2);
    expect(result).toBeCloseTo(0.35);
  });

  it("decreases score for rating 1 (forgot)", () => {
    const result = calculateNewFamiliarity(0.5, 1);
    expect(result).toBeCloseTo(0.2);
  });

  it("clamps at 0.0 (floor)", () => {
    const result = calculateNewFamiliarity(0.1, 1);
    expect(result).toBe(0.0);
  });

  it("clamps at 1.0 (ceiling)", () => {
    const result = calculateNewFamiliarity(0.9, 5);
    expect(result).toBe(1.0);
  });

  it("never goes below 0", () => {
    const result = calculateNewFamiliarity(0.0, 1);
    expect(result).toBeGreaterThanOrEqual(0.0);
  });

  it("never goes above 1", () => {
    const result = calculateNewFamiliarity(1.0, 5);
    expect(result).toBeLessThanOrEqual(1.0);
  });
});

describe("sortByWeight", () => {
  const makeWord = (
    word: string,
    queryCount: number,
    familiarityScore: number
  ): Vocabulary => ({
    id: word,
    user_id: "test-user",
    word,
    translation: `${word}_zh`,
    query_count: queryCount,
    familiarity_score: familiarityScore,
    quiz_correct_count: 0,
    last_queried: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });

  it("sorts by weight descending (highest need first)", () => {
    const words = [
      makeWord("easy", 2, 0.9), // weight: 0.2
      makeWord("hard", 10, 0.1), // weight: 9.0
      makeWord("medium", 5, 0.5), // weight: 2.5
    ];

    const sorted = sortByWeight(words);
    expect(sorted[0].word).toBe("hard");
    expect(sorted[1].word).toBe("medium");
    expect(sorted[2].word).toBe("easy");
  });

  it("does not mutate the input array", () => {
    const words = [
      makeWord("b", 1, 0),
      makeWord("a", 10, 0),
    ];
    const original = [...words];
    sortByWeight(words);
    expect(words).toEqual(original);
  });

  it("handles empty array", () => {
    expect(sortByWeight([])).toEqual([]);
  });

  it("handles single element", () => {
    const words = [makeWord("only", 5, 0.5)];
    const sorted = sortByWeight(words);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].word).toBe("only");
  });
});
