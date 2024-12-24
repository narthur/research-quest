import type ResearchQuest from "..";
import type { Quest } from "../services/storage";
import { extractContext } from "./extractContext";
import { generateContextHash } from "./generateContextHash";
import { validateQuestions } from "./validateQuestions";

export default async function refreshQuests(plugin: ResearchQuest) {
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
        const newQuests: Quest[] = await Promise.all(newQuestions.map(async (question) => {
          const contextSnapshot = await extractContext(fileContent, question, plugin.openai);
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
        }));

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
