import { extractJson } from "@/lib/gemini/parse";

describe("extractJson", () => {
  it("extracts JSON from markdown code block", () => {
    const input = '```json\n{"translation": "hello"}\n```';
    expect(extractJson(input)).toBe('{"translation": "hello"}');
  });

  it("extracts JSON from code block without language tag", () => {
    const input = '```\n{"key": "value"}\n```';
    expect(extractJson(input)).toBe('{"key": "value"}');
  });

  it("extracts raw JSON object", () => {
    const input = '{"translation": "hello", "synonyms": ["hi"]}';
    const result = extractJson(input);
    expect(JSON.parse(result)).toEqual({
      translation: "hello",
      synonyms: ["hi"],
    });
  });

  it("extracts JSON with surrounding text", () => {
    const input =
      'Here is the result: {"translation": "hello"} Hope that helps!';
    const result = extractJson(input);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result).translation).toBe("hello");
  });

  it("handles nested JSON objects", () => {
    const input =
      '{"translation": "hello", "extracted_words": [{"word": "hi"}]}';
    const result = extractJson(input);
    const parsed = JSON.parse(result);
    expect(parsed.extracted_words).toHaveLength(1);
  });

  it("returns plain text as-is when no JSON found", () => {
    const input = "This is just plain text";
    expect(extractJson(input)).toBe("This is just plain text");
  });

  it("handles empty string", () => {
    expect(extractJson("")).toBe("");
  });

  it("prefers code block over raw JSON", () => {
    const input =
      'Some text {"bad": true} then ```json\n{"good": true}\n``` end';
    const result = extractJson(input);
    expect(JSON.parse(result).good).toBe(true);
  });
});
