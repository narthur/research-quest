import { describe, it, expect, vi, beforeEach } from "vitest";
import generateNewQuests from "../generateNewQuests";
import type { Quest } from "../services/storage";

describe("generateNewQuests", () => {
  const mockPlugin: any = {
    openai: {
      generateQuestions: vi.fn(),
      evaluateQuestions: vi.fn(),
    },
    storage: {
      getQuests: vi.fn(),
      saveQuests: vi.fn(),
    },
    app: {
      workspace: {
        getActiveFile: vi.fn(),
      },
      vault: {
        read: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPlugin.app.workspace.getActiveFile.mockReturnValue({ path: "test.md" });
    mockPlugin.app.vault.read.mockResolvedValue("Test content");
    mockPlugin.storage.getQuests.mockResolvedValue([]);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should not generate questions if OpenAI is not configured", async () => {
    const pluginWithoutOpenAI = { ...mockPlugin, openai: undefined };
    await generateNewQuests(pluginWithoutOpenAI);
    expect(mockPlugin.storage.saveQuests).not.toHaveBeenCalled();
  });

  it("should not generate questions if no active file", async () => {
    mockPlugin.app.workspace.getActiveFile.mockReturnValue(null);
    await generateNewQuests(mockPlugin);
    expect(mockPlugin.storage.saveQuests).not.toHaveBeenCalled();
  });

  it("should generate new questions when less than 5 active questions", async () => {
    const newQuestions = ["Question 1", "Question 2"];
    mockPlugin.openai.generateQuestions.mockResolvedValue(newQuestions);

    await generateNewQuests(mockPlugin);

    expect(mockPlugin.openai.generateQuestions).toHaveBeenCalledWith(
      "Test content",
      5
    );
    expect(mockPlugin.storage.saveQuests).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          question: "Question 1",
          isCompleted: false,
          documentId: "test.md",
        }),
        expect.objectContaining({
          question: "Question 2",
          isCompleted: false,
          documentId: "test.md",
        }),
      ])
    );
  });

  it("should evaluate existing questions for completion", async () => {
    const existingQuests: Quest[] = [
      {
        id: "1",
        question: "Existing question",
        isCompleted: false,
        createdAt: Date.now(),
        documentId: "test.md",
        documentPath: "test.md",
      },
    ];

    mockPlugin.storage.getQuests.mockResolvedValue(existingQuests);
    mockPlugin.openai.evaluateQuestions.mockResolvedValue({
      evaluations: [
        {
          questionId: "1",
          isAnswered: true,
          explanation: "Found answer in text",
        },
      ],
    });

    await generateNewQuests(mockPlugin);

    expect(mockPlugin.openai.evaluateQuestions).toHaveBeenCalledWith(
      "Test content",
      expect.arrayContaining([
        expect.objectContaining({
          id: "1",
          question: "Existing question",
        }),
      ])
    );

    expect(mockPlugin.storage.saveQuests).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: "1",
          isCompleted: true,
          completedAt: expect.any(Number),
        }),
      ])
    );
  });

  it("should handle API errors gracefully", async () => {
    mockPlugin.openai.generateQuestions.mockRejectedValue(
      new Error("API Error")
    );

    await expect(generateNewQuests(mockPlugin)).resolves.not.toThrow();
    expect(console.error).toHaveBeenCalledWith(
      "Error refreshing quests:",
      expect.any(Error)
    );
  });

  it("should generate new questions when existing questions are marked complete", async () => {
    // Start with 5 existing questions
    const existingQuests: Quest[] = Array.from({ length: 5 }, (_, i) => ({
      id: `${i + 1}`,
      question: `Question ${i + 1}`,
      isCompleted: false,
      createdAt: Date.now(),
      documentId: "test.md",
      documentPath: "test.md",
    }));

    mockPlugin.storage.getQuests.mockResolvedValue(existingQuests);

    // Mock that 3 questions are now complete
    mockPlugin.openai.evaluateQuestions.mockResolvedValue({
      evaluations: [
        { questionId: "1", isAnswered: true, explanation: "Found answer" },
        { questionId: "2", isAnswered: true, explanation: "Found answer" },
        { questionId: "3", isAnswered: true, explanation: "Found answer" },
        { questionId: "4", isAnswered: false, explanation: "No answer yet" },
        { questionId: "5", isAnswered: false, explanation: "No answer yet" },
      ],
    });

    // Mock that 3 new questions will be generated to get back to 5 active questions
    mockPlugin.openai.generateQuestions
      .mockResolvedValueOnce([]) // First call during initial check (no new questions needed)
      .mockResolvedValueOnce(["New Question 1", "New Question 2", "New Question 3"]); // Second call after marking complete

    await generateNewQuests(mockPlugin);

    // Verify that new questions were generated after marking complete
    await generateNewQuests(mockPlugin);
    expect(mockPlugin.openai.generateQuestions).toHaveBeenLastCalledWith("Test content", 3);

    // Verify final state has 5 active questions (2 original + 3 new)
    const savedQuests = mockPlugin.storage.saveQuests.mock.calls.at(-1)[0];
    const activeQuests = savedQuests.filter((q: Quest) => !q.isCompleted);
    expect(activeQuests).toHaveLength(5);

    // Verify the specific questions that should be active
    expect(activeQuests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ question: "Question 4", isCompleted: false }),
        expect.objectContaining({ question: "Question 5", isCompleted: false }),
        expect.objectContaining({ question: "New Question 1", isCompleted: false }),
        expect.objectContaining({ question: "New Question 2", isCompleted: false }),
        expect.objectContaining({ question: "New Question 3", isCompleted: false }),
      ])
    );
  });
});
