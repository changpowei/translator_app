import {
  buildSystemInstruction,
  buildUserPrompt,
} from "@/lib/gemini/prompts";

describe("buildSystemInstruction", () => {
  it("includes past words when provided", () => {
    const result = buildSystemInstruction(["apple", "banana"]);
    expect(result).toContain("apple");
    expect(result).toContain("banana");
    expect(result).toContain("高頻單字");
  });

  it("includes reinforcement instruction when past words provided", () => {
    const result = buildSystemInstruction(["hello"]);
    expect(result).toContain("必須");
    expect(result).toContain("reinforced_words");
  });

  it("indicates no past words when empty", () => {
    const result = buildSystemInstruction([]);
    expect(result).toContain("沒有舊單字");
  });

  it("indicates no past words when not provided", () => {
    const result = buildSystemInstruction();
    expect(result).toContain("沒有舊單字");
  });

  it("includes JSON format instruction with pos_entries", () => {
    const result = buildSystemInstruction();
    expect(result).toContain("JSON");
    expect(result).toContain("translation");
    expect(result).toContain("pos_entries");
    expect(result).toContain("synonyms");
    expect(result).toContain("antonyms");
    expect(result).toContain("reinforced_words");
    expect(result).toContain("confusable_words");
  });

  it("requires example sentences with both en and zh", () => {
    const result = buildSystemInstruction();
    expect(result).toContain('"en"');
    expect(result).toContain('"zh"');
  });

  it("includes extracted_words instruction", () => {
    const result = buildSystemInstruction();
    expect(result).toContain("extracted_words");
  });

  it("enforces translation direction rule", () => {
    const result = buildSystemInstruction();
    expect(result).toContain("英文 → 翻譯成「中文」");
    expect(result).toContain("中文 → 翻譯成「英文」");
  });

  it("includes dictionary instructions for pos_entries", () => {
    const result = buildSystemInstruction();
    expect(result).toContain("part_of_speech");
    expect(result).toContain("meanings");
    expect(result).toContain("definition_en");
    expect(result).toContain("definition_zh");
  });

  it("includes confusable words instructions", () => {
    const result = buildSystemInstruction();
    expect(result).toContain("易混淆字");
    expect(result).toContain("confusable_words");
    expect(result).toContain("tip");
  });

  it("mentions probability-based sampling in past words section", () => {
    const result = buildSystemInstruction(["test"]);
    expect(result).toContain("抽樣");
    expect(result).toContain("不限於同義詞");
  });

  it("includes correction/error detection instructions", () => {
    const result = buildSystemInstruction();
    expect(result).toContain("correction");
    expect(result).toContain("has_error");
    expect(result).toContain("corrected");
    expect(result).toContain("拼寫錯誤");
  });

  it("includes usage_context instructions", () => {
    const result = buildSystemInstruction();
    expect(result).toContain("usage_context");
    expect(result).toContain("使用情境");
    expect(result).toContain("對話");
  });
});

describe("buildUserPrompt", () => {
  it("returns the user text directly", () => {
    expect(buildUserPrompt("你好世界")).toBe("你好世界");
  });

  it("returns English text directly", () => {
    expect(buildUserPrompt("hello")).toBe("hello");
  });
});
