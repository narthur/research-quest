interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    text: string;
    index: number;
    logprobs: null;
    finish_reason: string;
  }[];
}

interface QuestionEvaluation {
  isAnswered: boolean;
  explanation: string;
}

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
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async complete(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo-instruct',
        prompt,
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data: OpenAIResponse = await response.json();
    return data.choices[0].text;
  }

  async chat(messages: { role: 'system' | 'user' | 'assistant', content: string }[], functions?: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        functions: functions,
        function_call: functions ? { name: functions[0].name } : undefined,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    
    if (data.choices[0].finish_reason === 'function_call') {
      return JSON.parse(data.choices[0].message.function_call.arguments);
    }
    
    return data.choices[0].message.content;
  }

  async generateQuestions(text: string, count: number): Promise<string[]> {
    const functions = [
      {
        name: "generate_questions",
        description: "Generate research questions based on the provided text",
        parameters: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              description: "Array of research questions",
              items: {
                type: "string",
                description: "A specific research question"
              }
            }
          },
          required: ["questions"]
        }
      }
    ];

    const result = await this.chat([
      {
        role: "system",
        content: "You are a research assistant helping to generate focused research questions."
      },
      {
        role: "user",
        content: `Given the following text, generate ${count} specific research questions that would help deepen understanding of the topic:\n\n${text}`
      }
    ], functions) as GenerateQuestionsResponse;

    return result.questions;
  }

  async evaluateQuestions(text: string, questions: { id: string, question: string }[]): Promise<EvaluateQuestionsResponse> {
    const functions = [
      {
        name: "evaluate_questions",
        description: "Evaluate if research questions have been answered in the text",
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
                    description: "ID of the question being evaluated"
                  },
                  isAnswered: {
                    type: "boolean",
                    description: "Whether the question is fully answered in the text"
                  },
                  explanation: {
                    type: "string",
                    description: "Brief explanation of why the question is considered answered or not"
                  }
                },
                required: ["questionId", "isAnswered", "explanation"]
              }
            }
          },
          required: ["evaluations"]
        }
      }
    ];

    return await this.chat([
      {
        role: "system",
        content: `You are a strict research assistant evaluating if questions have been thoroughly answered. 
        Only mark a question as answered if the text provides a complete, clear answer with supporting evidence.
        A question is NOT answered if:
        - The answer is partial or incomplete
        - The text only tangentially relates to the question
        - The question requires information not present in the text`
      },
      {
        role: "user",
        content: `Evaluate if each question has been thoroughly answered in the following text:

Text:
${text}

Questions to evaluate:
${questions.map(q => `[${q.id}] ${q.question}`).join('\n')}`
      }
    ], functions) as EvaluateQuestionsResponse;
  }
}

export function createOpenAIService(apiKey: string): OpenAIService {
  return new OpenAIService(apiKey);
}
