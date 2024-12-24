export function extractContext(
  text: string,
  question: string,
  contextSize: number = 500
): string {
  // Find the most relevant section of text for this question
  // This is a simple implementation - could be enhanced with AI
  const words = text.split(/\s+/);
  if (words.length <= contextSize) return text;

  // Take a window of words around the middle of the text
  const start = Math.max(0, Math.floor(words.length / 2) - contextSize / 2);
  const end = Math.min(words.length, start + contextSize);
  return words.slice(start, end).join(" ");
}
