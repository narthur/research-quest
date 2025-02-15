import { describe, it, expect } from "vitest";
import { extractContext } from "./extractContext";

describe("extractContext", () => {
  it("should return full text if shorter than context size", () => {
    const text = "Short text";
    const result = extractContext(text, "question", 500);
    expect(result).toBe(text);
  });

  it("should extract context around middle of text", () => {
    const longText = Array(1000).fill("word").join(" ");
    const result = extractContext(longText, "question", 100);
    const words = result.split(/\s+/);
    expect(words.length).toBeLessThanOrEqual(100);
  });

  it("should handle empty text", () => {
    const result = extractContext("", "question");
    expect(result).toBe("");
  });
});
