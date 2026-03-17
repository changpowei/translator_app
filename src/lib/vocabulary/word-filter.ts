/**
 * Determines whether the input text is a single word or short phrase
 * (suitable for vocabulary saving) vs a sentence or paragraph.
 *
 * Rules:
 * - English: ≤ 4 words and no sentence-ending punctuation → word/phrase
 * - Chinese: ≤ 8 characters (excluding punctuation) and no sentence markers → word/phrase
 * - Mixed: apply the stricter check
 */

const SENTENCE_ENDINGS = /[.!?。！？；;…]/;
const CONTAINS_CHINESE = /[\u4e00-\u9fff]/;

export function isWordOrPhrase(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;

  // If it has sentence-ending punctuation, it's a sentence
  if (SENTENCE_ENDINGS.test(trimmed)) return false;

  const hasChinese = CONTAINS_CHINESE.test(trimmed);

  if (hasChinese) {
    // Count Chinese characters (exclude spaces, ASCII, punctuation)
    const chineseChars = trimmed.replace(/[^\u4e00-\u9fff]/g, "");
    // Chinese words/grammar terms are typically short
    return chineseChars.length <= 8;
  }

  // English / other: count words by splitting on whitespace
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.length <= 4;
}
