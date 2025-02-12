import { describe, it, expect } from "vitest";
import { generateContextHash } from "./generateContextHash";

describe("generateContextHash", () => {
  it("should generate consistent hash for same content", async () => {
    const content = "Test content";
    const hash1 = await generateContextHash(content);
    const hash2 = await generateContextHash(content);
    expect(hash1).toBe(hash2);
  });

  it("should generate different hashes for different content", async () => {
    const hash1 = await generateContextHash("Content 1");
    const hash2 = await generateContextHash("Content 2");
    expect(hash1).not.toBe(hash2);
  });

  it("should handle empty content", async () => {
    const hash = await generateContextHash("");
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
  });
});
