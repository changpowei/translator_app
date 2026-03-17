import { NextRequest, NextResponse } from "next/server";
import {
  getGeminiModel,
  MODEL_FALLBACK_CHAIN,
  isFallbackableError,
} from "@/lib/gemini/client";
import { buildSystemInstruction, buildUserPrompt } from "@/lib/gemini/prompts";
import { extractJson } from "@/lib/gemini/parse";
import {
  classifyGeminiError,
  MalformedResponseError,
} from "@/lib/gemini/errors";
import type { TranslationResponse } from "@/lib/gemini/types";
import {
  getWeightedRandomWords,
  upsertWord,
  upsertWords,
} from "@/lib/vocabulary/repository";
import { isWordOrPhrase } from "@/lib/vocabulary/word-filter";
import { isRateLimited, INPUT_MAX_LENGTH } from "@/lib/rate-limiter";
import { getAuthFromRequest, isAuthError } from "@/lib/supabase/auth-helpers";

/**
 * Try to generate content with a single model.
 * Returns parsed JSON on success, or throws.
 */
async function tryGenerateWithModel(
  modelId: string,
  systemInstruction: string,
  userPrompt: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const model = getGeminiModel(modelId);

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    systemInstruction: {
      role: "model",
      parts: [{ text: systemInstruction }],
    },
  });

  const responseText = result.response.text();
  const jsonStr = extractJson(responseText);

  try {
    return JSON.parse(jsonStr);
  } catch {
    // Retry once with stricter JSON instruction
    const retryResult = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      systemInstruction: {
        role: "model",
        parts: [
          {
            text:
              systemInstruction +
              "\n\n請確保回傳嚴格的 JSON 格式，不要包含任何 markdown。",
          },
        ],
      },
    });
    const retryText = retryResult.response.text();
    try {
      return JSON.parse(extractJson(retryText));
    } catch {
      throw new MalformedResponseError();
    }
  }
}

/**
 * Attempt generation across the model fallback chain.
 * Always starts from the first model; falls back on rate limit / quota errors only.
 */
async function generateWithFallback(
  systemInstruction: string,
  userPrompt: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ parsed: any; modelUsed: string }> {
  let lastError: unknown;

  for (const modelId of MODEL_FALLBACK_CHAIN) {
    try {
      const parsed = await tryGenerateWithModel(
        modelId,
        systemInstruction,
        userPrompt
      );
      return { parsed, modelUsed: modelId };
    } catch (error) {
      lastError = error;
      if (isFallbackableError(error)) {
        console.warn(
          `Model ${modelId} hit rate limit/quota, falling back to next model...`
        );
        continue;
      }
      // Non-rate-limit errors: don't fallback, throw immediately
      throw error;
    }
  }

  // All models exhausted
  throw lastError;
}

export async function POST(request: NextRequest) {
  // Auth check
  const auth = await getAuthFromRequest(request);
  if (isAuthError(auth)) return auth;
  const { userId, accessToken } = auth;

  // Rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "請求太頻繁，請稍後再試。" },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "請輸入要翻譯的文字" },
        { status: 400 }
      );
    }

    const trimmedText = text.trim();

    if (trimmedText.length > INPUT_MAX_LENGTH) {
      return NextResponse.json(
        { error: `輸入長度不可超過 ${INPUT_MAX_LENGTH} 字元` },
        { status: 400 }
      );
    }

    // Fetch weighted random words for reinforcement (probability-based sampling)
    let pastWords: string[] = [];
    try {
      const sampledWords = await getWeightedRandomWords(accessToken, 5);
      pastWords = sampledWords
        .filter((w) => w.word.toLowerCase() !== trimmedText.toLowerCase())
        .map((w) => w.word);
    } catch {
      // Supabase may not be configured yet; continue without past words
    }

    const systemInstruction = buildSystemInstruction(pastWords);
    const userPrompt = buildUserPrompt(trimmedText);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any;
    let modelUsed: string;
    try {
      ({ parsed, modelUsed } = await generateWithFallback(
        systemInstruction,
        userPrompt
      ));
      console.log(`Translation completed using model: ${modelUsed}`);
    } catch (error) {
      const classified = classifyGeminiError(error);
      return NextResponse.json(
        { error: classified.userMessage },
        { status: classified.statusCode }
      );
    }

    // Normalize example_sentences
    let exampleSentences = Array.isArray(parsed.example_sentences)
      ? parsed.example_sentences
      : [];
    if (exampleSentences.length === 0 && parsed.example_sentence) {
      exampleSentences = [{ en: parsed.example_sentence, zh: "" }];
    }

    // Normalize pos_entries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const posEntries = Array.isArray(parsed.pos_entries)
      ? parsed.pos_entries.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (pe: any) => ({
            part_of_speech: pe.part_of_speech ?? "",
            meanings: Array.isArray(pe.meanings)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ? pe.meanings.map((m: any) => ({
                    definition_en: m.definition_en ?? "",
                    definition_zh: m.definition_zh ?? "",
                    examples: Array.isArray(m.examples)
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      ? m.examples.map((ex: any) => ({
                            en: ex.en ?? "",
                            zh: ex.zh ?? "",
                          }))
                      : [],
                  }))
              : [],
          })
        )
      : [];

    // Normalize confusable_words
    const confusableWords = Array.isArray(parsed.confusable_words)
      ? parsed.confusable_words.map(
          (cw: {
            word?: string;
            meaning_zh?: string;
            meaning_en?: string;
            tip?: string;
          }) => ({
            word: cw.word ?? "",
            meaning_zh: cw.meaning_zh ?? "",
            meaning_en: cw.meaning_en ?? "",
            tip: cw.tip ?? "",
          })
        )
      : [];

    // Normalize correction
    const correction = parsed.correction?.has_error
      ? {
          has_error: true as const,
          original: parsed.correction.original ?? trimmedText,
          corrected: parsed.correction.corrected ?? "",
          explanation: parsed.correction.explanation ?? "",
        }
      : undefined;

    // Validate response shape
    const response: TranslationResponse = {
      translation: parsed.translation ?? "",
      phonetic: parsed.phonetic ?? undefined,
      pos_entries: posEntries,
      example_sentences: exampleSentences.map(
        (s: { en?: string; zh?: string }) => ({
          en: s.en ?? "",
          zh: s.zh ?? "",
        })
      ),
      synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms : [],
      antonyms: Array.isArray(parsed.antonyms) ? parsed.antonyms : [],
      confusable_words: confusableWords,
      detected_language: parsed.detected_language === "en" ? "en" : "zh",
      reinforced_words: Array.isArray(parsed.reinforced_words)
        ? parsed.reinforced_words
        : [],
      extracted_words: Array.isArray(parsed.extracted_words)
        ? parsed.extracted_words
        : undefined,
      correction,
      usage_context:
        parsed.usage_context && parsed.usage_context.title
          ? {
              title: parsed.usage_context.title ?? "",
              content: parsed.usage_context.content ?? "",
            }
          : undefined,
    };

    // Save the CORRECTED word (not the misspelled input) to database
    // Only save single words or short phrases, NOT sentences or paragraphs
    const wordToSave = correction?.corrected || trimmedText;
    if (isWordOrPhrase(wordToSave)) {
      upsertWord(accessToken, userId, wordToSave, response.translation).catch(
        (err) => console.error("Failed to save word:", err)
      );
    }

    if (response.extracted_words && response.extracted_words.length > 0) {
      const validatedWords = response.extracted_words
        .filter(
          (ew) =>
            typeof ew.word === "string" &&
            ew.word.length > 0 &&
            ew.word.length <= 100 &&
            typeof ew.translation === "string" &&
            ew.translation.length <= 200
        )
        .map((ew) => ({ word: ew.word, translation: ew.translation }));

      if (validatedWords.length > 0) {
        upsertWords(accessToken, userId, validatedWords).catch((err) =>
          console.error("Failed to save extracted words:", err)
        );
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: "翻譯失敗，請重新嘗試。" },
      { status: 500 }
    );
  }
}
