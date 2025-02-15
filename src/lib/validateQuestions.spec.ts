import { describe, it, expect, vi } from "vitest";
import { validateQuestions } from "./validateQuestions";
import type { Quest } from "../services/storage";
import { generateContextHash } from "./generateContextHash";

describe("validateQuestions", () => {
  const mockPlugin: any = {};

  it("should mark questions as obsolete when content hash changes", async () => {
    const quests: Quest[] = [{
      id: "1",
      question: "Test question",
      isCompleted: false,
      isDismissed: false,
      createdAt: Date.now(),
      documentId: "test.md",
      documentPath: "test.md",
      contextHash: "old-hash",
      contextSnapshot: "old content",
    }];

    const newContent = "new content";
    const validatedQuests = await validateQuestions(mockPlugin, quests, newContent);
    
    expect(validatedQuests[0].isObsolete).toBe(true);
    expect(validatedQuests[0].lastValidated).toBeDefined();
    expect(validatedQuests[0].obsoleteReason).toBeDefined();
  });

  it("should not mark questions as obsolete when content hash matches", async () => {
    const content = "test content";
    // First generate the actual hash
    const hash = await generateContextHash(content);
    
    const quests: Quest[] = [{
      id: "1",
      question: "Test question",
      isCompleted: false,
      isDismissed: false,
      createdAt: Date.now(),
      documentId: "test.md",
      documentPath: "test.md",
      contextHash: hash,
      contextSnapshot: content,
    }];

    const validatedQuests = await validateQuestions(mockPlugin, quests, content);
    
    expect(validatedQuests[0].isObsolete).toBeUndefined();
  });

  it("should skip validation for questions without context hash", async () => {
    const quests: Quest[] = [{
      id: "1",
      question: "Test question",
      isCompleted: false,
      isDismissed: false,
      createdAt: Date.now(),
      documentId: "test.md",
      documentPath: "test.md",
    }];

    const validatedQuests = await validateQuestions(mockPlugin, quests, "content");
    
    expect(validatedQuests[0]).toEqual(quests[0]);
  });
});
