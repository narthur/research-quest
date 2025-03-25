import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenAIService } from "./index";

describe("OpenAIService", () => {
  const mockSettings = {
    generatePrompt: "Test generate prompt",
    evaluatePrompt: "Test evaluate prompt",
    breakdownPrompt: "Test breakdown prompt",
  };

  let service: OpenAIService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      completions: {
        create: vi.fn(),
      },
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    };

    service = new OpenAIService("test-key", "gpt-4", mockSettings);
    service.client = mockClient;
  });

  describe("generateQuestions", () => {
    it("should generate questions using chat completion", async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              tool_calls: [
                {
                  function: {
                    arguments: JSON.stringify({
                      questions: ["Question 1", "Question 2"],
                    }),
                  },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
      });

      const questions = await service.generateQuestions("Test content", 2);

      expect(questions).toEqual(["Question 1", "Question 2"]);
      expect(mockClient.chat.completions.create).toHaveBeenCalledWith({
        model: "gpt-4",
        messages: [
          { role: "system", content: mockSettings.generatePrompt },
          { role: "user", content: expect.stringContaining("Test content") },
        ],
        tools: expect.arrayContaining([
          expect.objectContaining({
            type: "function",
            function: expect.objectContaining({
              name: "generate_questions",
            }),
          }),
        ]),
        temperature: 0.7,
      });
    });

    it("should throw error when no questions are generated", async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {},
            finish_reason: "stop",
          },
        ],
      });

      await expect(
        service.generateQuestions("Test content", 2)
      ).rejects.toThrow("No questions generated");
    });
  });

  describe("evaluateQuestions", () => {
    it("should evaluate questions using chat completion", async () => {
      const mockEvaluations = {
        evaluations: [
          {
            questionId: "1",
            isAnswered: true,
            explanation: "Found answer",
          },
        ],
      };

      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              tool_calls: [
                {
                  function: {
                    arguments: JSON.stringify(mockEvaluations),
                  },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
      });

      const result = await service.evaluateQuestions("Test content", [
        { id: "1", question: "Test question" },
      ]);

      expect(result).toEqual(mockEvaluations);
      expect(mockClient.chat.completions.create).toHaveBeenCalledWith({
        model: "gpt-4",
        messages: [
          { role: "system", content: mockSettings.evaluatePrompt },
          { role: "user", content: expect.stringContaining("Test content") },
        ],
        tools: expect.arrayContaining([
          expect.objectContaining({
            type: "function",
            function: expect.objectContaining({
              name: "evaluate_questions",
            }),
          }),
        ]),
        temperature: 0.7,
      });
    });

    it("should throw error when no evaluations are generated", async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {},
            finish_reason: "stop",
          },
        ],
      });

      await expect(
        service.evaluateQuestions("Test content", [
          { id: "1", question: "Test question" },
        ])
      ).rejects.toThrow("No evaluations generated");
    });
  });

  describe("breakdownQuestion", () => {
    it("should break down question into sub-questions", async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              tool_calls: [
                {
                  function: {
                    arguments: JSON.stringify({
                      questions: ["Sub-question 1", "Sub-question 2"],
                    }),
                  },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
      });

      const subQuestions = await service.breakdownQuestion(
        "Test content",
        "Main question"
      );

      expect(subQuestions).toEqual(["Sub-question 1", "Sub-question 2"]);
      expect(mockClient.chat.completions.create).toHaveBeenCalledWith({
        model: "gpt-4",
        messages: [
          { role: "system", content: mockSettings.breakdownPrompt },
          { role: "user", content: expect.stringContaining("Main question") },
        ],
        tools: expect.arrayContaining([
          expect.objectContaining({
            type: "function",
            function: expect.objectContaining({
              name: "generate_sub_questions",
            }),
          }),
        ]),
        temperature: 0.7,
      });
    });

    it("should throw error when no sub-questions are generated", async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {},
            finish_reason: "stop",
          },
        ],
      });

      await expect(
        service.breakdownQuestion("Test content", "Main question")
      ).rejects.toThrow("No questions generated");
    });
  });
});
