import { describe, it, expect, vi, beforeEach } from "vitest";
import refreshQuests from "./refreshQuests";
import type { Quest } from "../services/storage";

describe("refreshQuests", () => {
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
    mockPlugin.openai.generateQuestions.mockResolvedValue([]);
    mockPlugin.openai.evaluateQuestions.mockResolvedValue({ evaluations: [] });
    mockPlugin.storage.saveQuests.mockImplementation(
      async (quests: unknown) => quests
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should not generate questions if OpenAI is not configured", async () => {
    const pluginWithoutOpenAI = { ...mockPlugin, openai: undefined };
    await refreshQuests(pluginWithoutOpenAI);
    expect(mockPlugin.storage.saveQuests).not.toHaveBeenCalled();
  });

  it("should not generate questions if no active file", async () => {
    mockPlugin.app.workspace.getActiveFile.mockReturnValue(null);
    await refreshQuests(mockPlugin);
    expect(mockPlugin.storage.saveQuests).not.toHaveBeenCalled();
  });

  it("should generate initial questions when no active questions exist", async () => {
    const initialQuestions = [
      "Question 1",
      "Question 2",
      "Question 3",
      "Question 4",
      "Question 5",
    ];
    mockPlugin.openai.generateQuestions.mockResolvedValueOnce(initialQuestions);
    mockPlugin.storage.getQuests.mockResolvedValueOnce([]);

    await refreshQuests(mockPlugin);

    await vi.waitFor(() => {
      expect(mockPlugin.openai.generateQuestions).toHaveBeenCalledWith(
        "Test content",
        5
      );
      expect(mockPlugin.storage.saveQuests).toHaveBeenCalledTimes(1);
      const savedQuests = mockPlugin.storage.saveQuests.mock.calls[0][0];
      expect(savedQuests).toHaveLength(5);
      expect(savedQuests[0]).toMatchObject({
        question: "Question 1",
        isCompleted: false,
        documentId: "test.md",
      });
    });
  });

  it("should evaluate existing questions before generating new ones", async () => {
    const existingQuests: Quest[] = [
      {
        id: "1",
        question: "Existing question",
        isCompleted: false,
        isDismissed: false,
        createdAt: Date.now(),
        documentId: "test.md",
        documentPath: "test.md",
      },
    ];

    mockPlugin.storage.getQuests.mockResolvedValueOnce(existingQuests);
    mockPlugin.openai.evaluateQuestions.mockResolvedValueOnce({
      evaluations: [
        {
          questionId: "1",
          isAnswered: true,
          explanation: "Found answer in text",
        },
      ],
    });
    mockPlugin.openai.generateQuestions.mockResolvedValueOnce([
      "New Question 1",
      "New Question 2",
      "New Question 3",
      "New Question 4",
      "New Question 5",
    ]);

    await refreshQuests(mockPlugin);

    await vi.waitFor(() => {
      // First, should evaluate existing questions
      expect(mockPlugin.openai.evaluateQuestions).toHaveBeenCalledWith(
        "Test content",
        [{ id: "1", question: "Existing question" }]
      );

      // Then, should save the evaluation results
      expect(mockPlugin.storage.saveQuests).toHaveBeenCalledTimes(2);
      const firstSave = mockPlugin.storage.saveQuests.mock.calls[0][0];
      expect(firstSave[0]).toMatchObject({
        id: "1",
        isCompleted: true,
        completedAt: expect.any(Number),
      });

      // Finally, should generate new questions to maintain 5 active
      expect(mockPlugin.openai.generateQuestions).toHaveBeenCalledWith(
        "Test content",
        5
      );
      const secondSave = mockPlugin.storage.saveQuests.mock.calls[1][0];
      const activeQuests = secondSave.filter((q: Quest) => !q.isCompleted);
      expect(activeQuests).toHaveLength(5);
    });
  });

  it("should handle API errors gracefully", async () => {
    mockPlugin.openai.generateQuestions.mockRejectedValue(
      new Error("API Error")
    );

    await expect(refreshQuests(mockPlugin)).resolves.not.toThrow();
    expect(console.error).toHaveBeenCalledWith(
      "Error refreshing quests:",
      expect.any(Error)
    );
  });

  it("should not evaluate completed questions", async () => {
    const existingQuests: Quest[] = [
      {
        id: "1",
        question: "Completed question",
        isCompleted: true,
        isDismissed: false,
        createdAt: Date.now() - 1000,
        completedAt: Date.now(),
        documentId: "test.md",
        documentPath: "test.md",
      },
      {
        id: "2",
        question: "Active question",
        isCompleted: false,
        isDismissed: false,
        createdAt: Date.now(),
        documentId: "test.md",
        documentPath: "test.md",
      },
    ];

    mockPlugin.storage.getQuests.mockResolvedValue(existingQuests);
    mockPlugin.openai.evaluateQuestions.mockResolvedValue({
      evaluations: [
        {
          questionId: "2",
          isAnswered: true,
          explanation: "Found answer",
        },
      ],
    });

    await refreshQuests(mockPlugin);

    expect(mockPlugin.openai.evaluateQuestions).toHaveBeenCalledWith(
      "Test content",
      [{ id: "2", question: "Active question" }]
    );
  });

  it("should not evaluate dismissed questions", async () => {
    const existingQuests: Quest[] = [
      {
        id: "1",
        question: "Dismissed question",
        isCompleted: false,
        isDismissed: true,
        createdAt: Date.now() - 1000,
        dismissedAt: Date.now(),
        documentId: "test.md",
        documentPath: "test.md",
      },
      {
        id: "2",
        question: "Active question",
        isCompleted: false,
        isDismissed: false,
        createdAt: Date.now(),
        documentId: "test.md",
        documentPath: "test.md",
      },
    ];

    mockPlugin.storage.getQuests.mockResolvedValue(existingQuests);
    mockPlugin.openai.evaluateQuestions.mockResolvedValue({
      evaluations: [
        {
          questionId: "2",
          isAnswered: true,
          explanation: "Found answer",
        },
      ],
    });

    await refreshQuests(mockPlugin);

    expect(mockPlugin.openai.evaluateQuestions).toHaveBeenCalledWith(
      "Test content",
      [{ id: "2", question: "Active question" }]
    );
  });

  it("should follow the basic flow", async () => {
    console.log("Setting up test mocks");
    const initialQuestions = ["Q1"];
    mockPlugin.openai.generateQuestions.mockResolvedValueOnce(initialQuestions);
    mockPlugin.storage.getQuests.mockResolvedValueOnce([]);
    mockPlugin.storage.saveQuests.mockImplementation(async (quests) => {
      console.log("saveQuests called with:", quests);
      return quests;
    });

    console.log("Running refreshQuests");
    await refreshQuests(mockPlugin);

    console.log("Waiting for assertions");
    await vi.waitFor(() => {
      expect(mockPlugin.storage.saveQuests).toHaveBeenCalled();
    });
  });
});
