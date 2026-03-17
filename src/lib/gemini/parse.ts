/**
 * Extract JSON from Gemini response text.
 *
 * Handles three cases:
 * 1. JSON wrapped in markdown code blocks (```json ... ```)
 * 2. Raw JSON object in text
 * 3. Plain text (returned as-is for caller to handle)
 */
export function extractJson(text: string): string {
  // Case 1: markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Case 2: raw JSON object (non-greedy to avoid capturing trailing text)
  const jsonMatch = text.match(/\{[\s\S]*?\}(?=[^}]*$)/);
  if (jsonMatch) {
    // Validate it's actually parseable before returning
    try {
      JSON.parse(jsonMatch[0]);
      return jsonMatch[0];
    } catch {
      // Fall through to find the largest valid JSON object
    }
  }

  // Case 2b: try greedy match for nested objects
  const greedyMatch = text.match(/\{[\s\S]*\}/);
  if (greedyMatch) {
    return greedyMatch[0];
  }

  // Case 3: return as-is
  return text;
}
