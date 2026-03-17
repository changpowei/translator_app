export interface ExampleSentence {
  readonly en: string;
  readonly zh: string;
}

export interface WordMeaning {
  readonly definition_en: string;
  readonly definition_zh: string;
  readonly examples: readonly ExampleSentence[];
}

export interface PosEntry {
  readonly part_of_speech: string;
  readonly meanings: readonly WordMeaning[];
}

export interface ConfusableWord {
  readonly word: string;
  readonly meaning_zh: string;
  readonly meaning_en: string;
  readonly tip: string;
}

export interface Correction {
  readonly has_error: boolean;
  readonly original: string;
  readonly corrected: string;
  readonly explanation: string;
}

export interface UsageContext {
  readonly title: string;
  readonly content: string;
}

export interface TranslationResponse {
  readonly translation: string;
  readonly phonetic?: string;
  readonly pos_entries: readonly PosEntry[];
  readonly example_sentences: readonly ExampleSentence[];
  readonly synonyms: readonly string[];
  readonly antonyms: readonly string[];
  readonly confusable_words: readonly ConfusableWord[];
  readonly detected_language: "zh" | "en";
  readonly reinforced_words: readonly string[];
  readonly extracted_words?: readonly ExtractedWord[];
  readonly correction?: Correction;
  readonly usage_context?: UsageContext;
}

export interface ExtractedWord {
  readonly word: string;
  readonly translation: string;
  readonly phonetic?: string;
  readonly part_of_speech?: string;
}

export interface QuizQuestion {
  readonly word_id: string;
  readonly word: string;
  readonly correct_translation: string;
  readonly options: readonly string[];
  readonly correct_index: number;
}
