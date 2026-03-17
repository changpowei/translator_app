"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TtsButton } from "./TtsButton";
import { CopyButton } from "./CopyButton";
import type { TranslationResponse } from "@/lib/gemini/types";

interface TranslationResultProps {
  readonly result: TranslationResponse;
  readonly onWordClick?: (word: string) => void;
}

function ClickableWord({
  word,
  onClick,
}: {
  readonly word: string;
  readonly onClick?: (word: string) => void;
}) {
  if (!onClick) return <>{word}</>;
  const clean = word.replace(/[^a-zA-Z'-]/g, "");
  if (!clean || clean.length < 2) return <>{word}</>;

  return (
    <span
      className="cursor-pointer rounded-sm px-0.5 transition-colors hover:bg-primary/10 hover:text-primary"
      onClick={() => onClick(clean)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick(clean);
      }}
    >
      {word}
    </span>
  );
}

function renderSentence(
  sentence: string,
  reinforcedWords: readonly string[],
  onWordClick?: (word: string) => void
): React.ReactNode {
  const tokens = sentence.split(/(\s+)/);

  return tokens.map((token, i) => {
    if (/^\s+$/.test(token)) return token;

    const cleanWord = token.replace(/[^a-zA-Z'-]/g, "");
    const isReinforced = reinforcedWords.some(
      (w) => w.toLowerCase() === cleanWord.toLowerCase()
    );

    if (isReinforced) {
      return (
        <span
          key={i}
          className="cursor-pointer rounded bg-amber-100 px-0.5 font-semibold text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
          onClick={() => onWordClick?.(cleanWord)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") onWordClick?.(cleanWord);
          }}
        >
          {token}
        </span>
      );
    }

    return <ClickableWord key={i} word={token} onClick={onWordClick} />;
  });
}

const POS_LABELS: Record<string, string> = {
  noun: "名詞",
  verb: "動詞",
  adjective: "形容詞",
  adverb: "副詞",
  preposition: "介系詞",
  conjunction: "連接詞",
  pronoun: "代名詞",
  interjection: "感嘆詞",
};

export function TranslationResult({
  result,
  onWordClick,
}: TranslationResultProps) {
  const ttsLang = result.detected_language === "zh" ? "en" : "zh";

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-xl leading-snug">
              {result.translation}
            </CardTitle>
            <div className="mt-1 flex items-center gap-2">
              {result.phonetic && (
                <span className="text-xs text-muted-foreground">
                  {result.phonetic}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {result.detected_language === "zh"
                  ? "中文 → 英文"
                  : "英文 → 中文"}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 gap-0.5">
            <CopyButton text={result.translation} />
            <TtsButton text={result.translation} lang={ttsLang} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Correction Alert */}
        {result.correction?.has_error && (
          <div className="rounded-lg border border-red-200/60 bg-red-50/50 px-3 py-2.5 dark:border-red-800/30 dark:bg-red-900/10">
            <p className="text-xs font-semibold text-red-700 dark:text-red-400">
              ✏️ 拼寫/文法提醒
            </p>
            <p className="mt-1 text-sm">
              <span className="line-through text-red-400">
                {result.correction.original}
              </span>
              {" → "}
              <span
                className="cursor-pointer font-semibold text-green-700 hover:underline dark:text-green-400"
                onClick={() => onWordClick?.(result.correction!.corrected)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    onWordClick?.(result.correction!.corrected);
                }}
              >
                {result.correction.corrected}
              </span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {result.correction.explanation}
            </p>
          </div>
        )}

        {/* Dictionary: POS Entries */}
        {result.pos_entries.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              字典
            </h4>
            {result.pos_entries.map((pe, pi) => (
              <div key={pi} className="space-y-1.5">
                <Badge variant="secondary" className="text-[10px] font-medium">
                  {POS_LABELS[pe.part_of_speech.toLowerCase()] ??
                    pe.part_of_speech}
                </Badge>
                {pe.meanings.map((m, mi) => (
                  <div
                    key={mi}
                    className="ml-2 rounded-lg bg-muted/30 px-3 py-2"
                  >
                    <p className="text-sm font-medium">{m.definition_zh}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.definition_en}
                    </p>
                    {m.examples.map((ex, ei) => (
                      <div key={ei} className="mt-1.5 pl-2 border-l-2 border-primary/20">
                        <p className="text-xs leading-relaxed">
                          {renderSentence(
                            ex.en,
                            result.reinforced_words,
                            onWordClick
                          )}
                        </p>
                        {ex.zh && (
                          <p className="text-[11px] text-muted-foreground">
                            {ex.zh}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Confusable Words */}
        {result.confusable_words.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                ⚠ 易混淆字
              </h4>
              {result.confusable_words.map((cw, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-orange-200/60 bg-orange-50/50 px-3 py-2 dark:border-orange-800/30 dark:bg-orange-900/10"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="cursor-pointer font-medium text-sm text-orange-800 dark:text-orange-300 hover:underline"
                      onClick={() => onWordClick?.(cw.word)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onWordClick?.(cw.word);
                      }}
                    >
                      {cw.word}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {cw.meaning_zh}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {cw.meaning_en}
                  </p>
                  <p className="mt-1 text-[11px] text-orange-700 dark:text-orange-400">
                    💡 {cw.tip}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Example Sentences */}
        {result.example_sentences.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                例句
              </h4>
              {result.example_sentences.map((s, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-muted/40 px-3 py-2.5 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="leading-relaxed">
                      {renderSentence(
                        s.en,
                        result.reinforced_words,
                        onWordClick
                      )}
                    </p>
                    <div className="flex shrink-0 gap-0.5">
                      <CopyButton text={s.en} />
                      <TtsButton text={s.en} lang="en" />
                    </div>
                  </div>
                  {s.zh && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.zh}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Usage Context */}
        {result.usage_context && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                📖 {result.usage_context.title}
              </h4>
              <div className="rounded-lg border border-blue-200/50 bg-blue-50/40 px-3 py-2.5 text-sm leading-relaxed text-foreground/90 dark:border-blue-800/30 dark:bg-blue-900/10">
                {result.usage_context.content}
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Synonyms & Antonyms */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              同義字
            </h4>
            <div className="flex flex-wrap gap-1">
              {result.synonyms.map((s) => (
                <Badge
                  key={s}
                  variant="secondary"
                  className="cursor-pointer text-xs transition-colors hover:bg-secondary/80"
                  onClick={() => onWordClick?.(s)}
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              反義字
            </h4>
            <div className="flex flex-wrap gap-1">
              {result.antonyms.map((a) => (
                <Badge
                  key={a}
                  variant="outline"
                  className="cursor-pointer text-xs transition-colors hover:bg-accent"
                  onClick={() => onWordClick?.(a)}
                >
                  {a}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Extracted Words */}
        {result.extracted_words && result.extracted_words.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                學習重點
              </h4>
              <div className="grid gap-1.5">
                {result.extracted_words.map((ew) => (
                  <div
                    key={ew.word}
                    className="flex items-center justify-between rounded-md border border-border/30 px-2.5 py-1.5 text-sm transition-colors hover:bg-accent/30 cursor-pointer"
                    onClick={() => onWordClick?.(ew.word)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onWordClick?.(ew.word);
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{ew.word}</span>
                      {ew.phonetic && (
                        <span className="text-[11px] text-muted-foreground">
                          {ew.phonetic}
                        </span>
                      )}
                      {ew.part_of_speech && (
                        <span className="text-[10px] text-muted-foreground/70">
                          {ew.part_of_speech}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        {ew.translation}
                      </span>
                      <TtsButton text={ew.word} lang="en" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Reinforced Words Notice */}
        {result.reinforced_words.length > 0 && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">
            複習舊單字：{result.reinforced_words.join("、")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
