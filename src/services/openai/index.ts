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
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
    });
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
      model: "gpt-4o",
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
          content:
            "You are a research assistant helping to generate focused research questions.",
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
          content: `You are a strict research assistant evaluating if questions have been thoroughly answered. 
        Only mark a question as answered if the text provides a complete, clear answer with supporting evidence.
        A question is NOT answered if:
        - The answer is partial or incomplete
        - The text only tangentially relates to the question
        - The question requires information not present in the text`,
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
          content:
            "You are a research assistant helping to break down complex research questions into more specific, focused sub-questions.",
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

export function createOpenAIService(apiKey: string): OpenAIService {
  return new OpenAIService(apiKey);
}
