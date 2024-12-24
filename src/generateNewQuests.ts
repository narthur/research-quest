import type ResearchQuest from ".";
import type { Quest } from "./services/storage";

export default async function generateNewQuests(plugin: ResearchQuest) {
  if (!plugin.openai) {
    console.error("OpenAI API key not configured");
    return;
  }

  const activeFile = plugin.app.workspace.getActiveFile();
  if (!activeFile) {
    console.log("No active file");
    return;
  }

  try {
    const fileContent = await plugin.app.vault.read(activeFile);
    const quests = await plugin.storage.getQuests();
    const currentActiveQuests = quests.filter((q) => !q.isCompleted);
    const numQuestsNeeded = 5 - currentActiveQuests.length;

    if (numQuestsNeeded > 0) {
      const newQuestions = await plugin.openai.generateQuestions(
        fileContent,
        numQuestsNeeded
      );
      console.log("New questions:", newQuestions);
      const newQuests: Quest[] = newQuestions.map((question) => ({
        id: crypto.randomUUID(),
        question,
        isCompleted: false,
        createdAt: Date.now(),
      }));

      await plugin.storage.saveQuests([...quests, ...newQuests]);
    }

    // Check for completed quests
    if (currentActiveQuests.length > 0) {
      const evaluations = await plugin.openai.evaluateQuestions(
        fileContent,
        currentActiveQuests.map((q) => ({ id: q.id, question: q.question }))
      );

      // Update quest completion status based on evaluations
      const updated = quests.map((quest) => {
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

      await plugin.storage.saveQuests(updated);
    }
  } catch (error) {
    console.error("Error refreshing quests:", error);
  }
}
