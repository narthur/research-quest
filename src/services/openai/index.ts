import OpenAI from "openai";
import type { ChatCompletion } from "openai/resources/index.mjs";

interface GenerateQuestionsResponse {
  questions: string[];
}

interface EvaluateQuestionsResponse {
  evaluations: {
    questionId: string;
    isAnswered: boolean;
    explanation: string;
  }[];
}

export class OpenAIService {
  client: OpenAI;
  private model: string;
  private settings: {
    generatePrompt: string;
    evaluatePrompt: string;
    breakdownPrompt: string;
  };

  constructor(apiKey: string, model: string = "gpt-4", settings: {
    generatePrompt: string;
    evaluatePrompt: string;
    breakdownPrompt: string;
  }) {
    this.client = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
    });
    this.model = model;
    this.settings = settings;
  }

  async complete(prompt: string): Promise<string> {
    const response = await this.client.completions.create({
      model: "gpt-3.5-turbo-instruct",
      prompt,
      max_tokens: 150,
      temperature: 0.7,
    });

    return response.choices[0].text;
  }

  async chat(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    tools?: OpenAI.Chat.Completions.ChatCompletionTool[] | undefined
  ): Promise<
    | EvaluateQuestionsResponse
    | GenerateQuestionsResponse
    | ChatCompletion.Choice["message"]
  > {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      tools: tools,
      temperature: 0.7,
    });

    const choice = response.choices[0];

    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
      return JSON.parse(choice.message.tool_calls[0].function.arguments);
    }

    return choice.message;
  }

  async generateQuestions(text: string, count: number): Promise<string[]> {
    const result = await this.chat(
      [
        {
          role: "system",
          content: this.settings.generatePrompt,
        },
        {
          role: "user",
          content: `Given the following text, generate ${count} specific research questions that would help deepen understanding of the topic:\n\n${text}`,
        },
      ],
      [
        {
          type: "function" as const,
          function: {
            name: "generate_questions",
            description:
              "Generate research questions based on the provided text",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  description: "Array of research questions",
                  items: {
                    type: "string",
                    description: "A specific research question",
                  },
                },
              },
              required: ["questions"],
            },
          },
        },
      ]
    );

    if (!("questions" in result)) {
      throw new Error("No questions generated");
    }

    return result.questions;
  }

  async evaluateQuestions(
    text: string,
    questions: { id: string; question: string }[]
  ): Promise<EvaluateQuestionsResponse> {
    const result = await this.chat(
      [
        {
          role: "system",
          content: this.settings.evaluatePrompt,
        },
        {
          role: "user",
          content: `Evaluate if each question has been thoroughly answered in the following text:

Text:
${text}

Questions to evaluate:
${questions.map((q) => `[${q.id}] ${q.question}`).join("\n")}`,
        },
      ],
      [
        {
          type: "function" as const,
          function: {
            name: "evaluate_questions",
            description:
              "Evaluate if research questions have been answered in the text",
            parameters: {
              type: "object",
              properties: {
                evaluations: {
                  type: "array",
                  description: "Array of question evaluations",
                  items: {
                    type: "object",
                    properties: {
                      questionId: {
                        type: "string",
                        description: "ID of the question being evaluated",
                      },
                      isAnswered: {
                        type: "boolean",
                        description:
                          "Whether the question is fully answered in the text",
                      },
                      explanation: {
                        type: "string",
                        description:
                          "Brief explanation of why the question is considered answered or not",
                      },
                    },
                    required: ["questionId", "isAnswered", "explanation"],
                  },
                },
              },
              required: ["evaluations"],
            },
          },
        },
      ]
    );

    if (!("evaluations" in result)) {
      throw new Error("No evaluations generated");
    }

    return result;
  }

  async breakdownQuestion(text: string, question: string): Promise<string[]> {
    const result = await this.chat(
      [
        {
          role: "system",
          content: this.settings.breakdownPrompt,
        },
        {
          role: "user",
          content: `Given this research question: "${question}"

And this context text:
${text}

Generate 3-5 more specific sub-questions that would help answer the main question. These should be more focused and specific than the parent question.`,
        },
      ],
      [
        {
          type: "function" as const,
          function: {
            name: "generate_sub_questions",
            description:
              "Generate more specific sub-questions that help break down a broader research question",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  description: "Array of more specific sub-questions",
                  items: {
                    type: "string",
                    description: "A specific sub-question",
                  },
                },
              },
              required: ["questions"],
            },
          },
        },
      ]
    );

    if (!("questions" in result)) {
      throw new Error("No questions generated");
    }

    return result.questions;
  }
}

export function createOpenAIService(apiKey: string, model: string = "gpt-4", settings: {
  generatePrompt: string;
  evaluatePrompt: string;
  breakdownPrompt: string;
}): OpenAIService {
  return new OpenAIService(apiKey, model, settings);
}
