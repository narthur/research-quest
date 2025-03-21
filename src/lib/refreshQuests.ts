import type ResearchQuest from "..";
import type { Quest } from "../services/storage";
import { extractContext } from "./extractContext";
import { generateContextHash } from "./generateContextHash";

async function evaluateExistingQuests(
  plugin: ResearchQuest,
  fileContent: string,
  quests: Quest[],
  activeFilePath: string
): Promise<Quest[]> {
  if (!plugin.openai) {
    throw new Error("OpenAI API key not configured");
  }

  const activeQuests = quests.filter(
    (q) => q.documentId === activeFilePath && !q.isCompleted && !q.isDismissed
  );
  if (activeQuests.length === 0) return quests;

  const evaluations = await plugin.openai.evaluateQuestions(
    fileContent,
    activeQuests.map((q) => ({ id: q.id, question: q.question }))
  );

  return quests.map((q) => {
    const evaluation = evaluations.evaluations.find(
      (e) => e.questionId === q.id
    );
    if (evaluation?.isAnswered) {
      return { ...q, isCompleted: true, completedAt: Date.now() };
    }
    return q;
  });
}

async function generateNewQuests(
  plugin: ResearchQuest,
  fileContent: string,
  activeFilePath: string,
  count: number
): Promise<Quest[]> {
  if (!plugin.openai) {
    throw new Error("OpenAI API key not configured");
  }

  const newQuestions = await plugin.openai.generateQuestions(
    fileContent,
    count
  );
  const newQuests = await Promise.all(
    newQuestions.map(async (question) => {
      const contextSnapshot = extractContext(fileContent, question);
      const contextHash = await generateContextHash(fileContent);
      return {
        id: crypto.randomUUID(),
        question,
        isCompleted: false,
        isDismissed: false,
        createdAt: Date.now(),
        documentId: activeFilePath,
        documentPath: activeFilePath,
        contextHash,
        contextSnapshot,
        lastValidated: Date.now(),
      };
    })
  );
  return newQuests;
}

export default async function refreshQuests(plugin: ResearchQuest) {
  if (!plugin.openai) {
    console.error("OpenAI API key not configured");
    return;
  }

  const activeFile = plugin.app.workspace.getActiveFile();
  if (!activeFile) return;

  try {
    const fileContent = await plugin.app.vault.read(activeFile);
    const quests = await plugin.storage.getQuests();
    const activeFilePath = activeFile.path;
    const currentQuests = quests.filter((q) => q.documentId === activeFilePath);
    const currentActiveQuests = currentQuests.filter(
      (q) => !q.isCompleted && !q.isDismissed
    );

    // If no active quests at all, generate initial set
    if (currentActiveQuests.length === 0) {
      const newQuests = await generateNewQuests(
        plugin,
        fileContent,
        activeFilePath,
        5
      );
      await plugin.storage.saveQuests([...quests, ...newQuests]);
      return;
    }

    // Phase 1: Evaluation
    const evaluatedQuests = await evaluateExistingQuests(
      plugin,
      fileContent,
      quests,
      activeFilePath
    );
    await plugin.storage.saveQuests(evaluatedQuests);

    // Phase 2: Generation if needed
    const remainingActive = evaluatedQuests.filter(
      (q) => q.documentId === activeFilePath && !q.isCompleted && !q.isDismissed
    );

    if (remainingActive.length < 5) {
      const countNeeded = 5 - remainingActive.length;
      const newQuests = await generateNewQuests(
        plugin,
        fileContent,
        activeFilePath,
        countNeeded
      );
      await plugin.storage.saveQuests([...evaluatedQuests, ...newQuests]);
    }
  } catch (error) {
    console.error("Error refreshing quests:", error);
  }
}
