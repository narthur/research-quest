import type { OpenAIService } from "../services/openai";

export async function extractContext(
  text: string,
  question: string,
  openai?: OpenAIService,
  contextSize: number = 500
): Promise<string> {
  // If no OpenAI service available, fall back to basic extraction
  if (!openai) {
    const words = text.split(/\s+/);
    if (words.length <= contextSize) return text;
    const start = Math.max(0, Math.floor(words.length / 2) - contextSize / 2);
    const end = Math.min(words.length, start + contextSize);
    return words.slice(start, end).join(" ");
  }

  // Use OpenAI to find relevant context
  const response = await openai.chat([
    {
      role: "system",
      content:
        "You are a research assistant helping to identify the most relevant context for a research question. Extract only the most relevant paragraphs, being as concise as possible while including all necessary context.",
    },
    {
      role: "user",
      content: `Given this research question: "${question}"

Find the most relevant section from this text (max ${contextSize} words):

${text}`,
    },
  ]);

  if ("content" in response && response.content) {
    return response.content;
  }

  // Fallback to basic extraction if chat fails
  const words = text.split(/\s+/);
  if (words.length <= contextSize) return text;
  const start = Math.max(0, Math.floor(words.length / 2) - contextSize / 2);
  const end = Math.min(words.length, start + contextSize);
  return words.slice(start, end).join(" ");
}
