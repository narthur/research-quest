import type ResearchQuest from ".";
import type { Quest } from "./services/storage";
import { createHash } from "crypto";

export function generateContextHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

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

async function validateQuestions(
  plugin: ResearchQuest,
  quests: Quest[],
  fileContent: string
): Promise<Quest[]> {
  const currentHash = generateContextHash(fileContent);

  return quests.map((quest) => {
    if (!quest.contextHash || !quest.contextSnapshot) return quest;

    // Mark as obsolete if hash has changed and content is significantly different
    if (quest.contextHash !== currentHash) {
      return {
        ...quest,
        isObsolete: true,
        lastValidated: Date.now(),
        obsoleteReason: "Document content has changed significantly",
      };
    }

    return quest;
  });
}

export default async function generateNewQuests(plugin: ResearchQuest) {
  if (!plugin.openai) {
    console.error("OpenAI API key not configured");
    return;
  }

  const activeFile = plugin.app.workspace.getActiveFile();
  if (!activeFile) {
    return;
  }

  try {
    const fileContent = await plugin.app.vault.read(activeFile);
    const quests = await plugin.storage.getQuests();
    const currentQuests = quests.filter(
      (q) => q.documentId === activeFile.path
    );
    const currentActiveQuests = currentQuests.filter(
      (q) => !q.isCompleted && !q.isDismissed
    );

    // Validate existing questions
    const validatedQuests = await validateQuestions(
      plugin,
      quests,
      fileContent
    );

    // First evaluate existing quests
    if (currentActiveQuests.length > 0) {
      const evaluations = await plugin.openai.evaluateQuestions(
        fileContent,
        currentActiveQuests.map((q) => ({ id: q.id, question: q.question }))
      );

      // Update quest completion status based on evaluations
      const updatedQuests = validatedQuests.map((quest) => {
        const evaluation = evaluations.evaluations.find(
          (e) => e.questionId === quest.id
        );
        if (evaluation?.isAnswered) {
          return {
            ...quest,
            isCompleted: true,
            completedAt: Date.now(),
          };
        }
        return quest;
      });

      // Calculate how many new quests we need after evaluations
      const remainingActiveQuests = updatedQuests.filter(
        (q) =>
          !q.isCompleted && !q.isDismissed && q.documentId === activeFile.path
      );
      const numQuestsNeeded = 5 - remainingActiveQuests.length;

      if (numQuestsNeeded > 0) {
        // Generate new questions in a single batch
        const newQuestions = await plugin.openai.generateQuestions(
          fileContent,
          numQuestsNeeded
        );
        const newQuests: Quest[] = newQuestions.map((question) => {
          const contextSnapshot = extractContext(fileContent, question);
          return {
            id: crypto.randomUUID(),
            question,
            isCompleted: false,
            isDismissed: false,
            createdAt: Date.now(),
            documentId: activeFile.path,
            documentPath: activeFile.path,
            contextHash: generateContextHash(fileContent),
            contextSnapshot,
            lastValidated: Date.now(),
          };
        });

        // Save everything in one operation
        await plugin.storage.saveQuests([...updatedQuests, ...newQuests]);
      } else {
        // Just save the updated completion statuses
        await plugin.storage.saveQuests(updatedQuests);
      }
    } else {
      // No existing quests, just generate 5 new ones
      const newQuestions = await plugin.openai.generateQuestions(
        fileContent,
        5
      );
      const newQuests: Quest[] = newQuestions.map((question) => ({
        id: crypto.randomUUID(),
        question,
        isCompleted: false,
        isDismissed: false,
        createdAt: Date.now(),
        documentId: activeFile.path,
        documentPath: activeFile.path,
      }));

      await plugin.storage.saveQuests([...quests, ...newQuests]);
    }
  } catch (error) {
    console.error("Error refreshing quests:", error);
  }
}
