import { isWordOrPhrase } from "@/lib/vocabulary/word-filter";

describe("isWordOrPhrase", () => {
  it("returns true for a single English word", () => {
    expect(isWordOrPhrase("hello")).toBe(true);
  });

  it("returns true for a short English phrase (2-4 words)", () => {
    expect(isWordOrPhrase("look forward to")).toBe(true);
    expect(isWordOrPhrase("in spite of")).toBe(true);
  });

  it("returns false for an English sentence (>4 words)", () => {
    expect(isWordOrPhrase("I want to go to the store")).toBe(false);
  });

  it("returns false for text with sentence-ending punctuation", () => {
    expect(isWordOrPhrase("Hello!")).toBe(false);
    expect(isWordOrPhrase("Really?")).toBe(false);
    expect(isWordOrPhrase("Done.")).toBe(false);
  });

  it("returns true for a short Chinese word", () => {
    expect(isWordOrPhrase("你好")).toBe(true);
    expect(isWordOrPhrase("學習")).toBe(true);
  });

  it("returns true for a Chinese phrase up to 8 characters", () => {
    expect(isWordOrPhrase("不管怎麼樣")).toBe(true);
  });

  it("returns false for a Chinese sentence", () => {
    expect(isWordOrPhrase("我今天去了超市買了很多東西回來")).toBe(false);
  });

  it("returns false for Chinese with sentence-ending punctuation", () => {
    expect(isWordOrPhrase("你好嗎？")).toBe(false);
    expect(isWordOrPhrase("走吧。")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isWordOrPhrase("")).toBe(false);
  });

  it("returns true for grammar terms", () => {
    expect(isWordOrPhrase("present perfect")).toBe(true);
    expect(isWordOrPhrase("被動語態")).toBe(true);
  });
});
