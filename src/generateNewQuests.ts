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
      const prompt = `Given the following text, generate ${numQuestsNeeded} specific research questions that would help deepen understanding of the topic. Format the response as a JSON array of strings, each string being a question:\n\n${fileContent}`;

      const response = await plugin.openai.chat([
        {
          role: "system",
          content:
            'You are a research assistant helping to generate focused research questions. You must respond with only a JSON array of strings, with no additional formatting, markdown, or explanation. Example response: ["Question 1?", "Question 2?"]',
        },
        { role: "user", content: prompt },
      ]);

      // Clean the response of any markdown formatting
      const cleanJson = response.replace(/```json\n?|\n?```/g, "").trim();
      const newQuestions: string[] = JSON.parse(cleanJson);
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
      const completionPrompt = `Given the following text, determine if each research question has been thoroughly answered. A question is only considered answered if the text provides a clear, complete response to the question. Respond with a JSON array of boolean values matching the order of the questions.

Text:
${fileContent}

Questions:
${currentActiveQuests.map((q, i) => `${i + 1}. ${q.question}`).join("\n")}

Consider a question answered (true) only if:
- The text directly addresses all aspects of the question
- The answer is substantive and complete
- There is clear evidence in the text supporting the answer

Return false if:
- The answer is partial or incomplete
- The text only tangentially relates to the question
- The question requires information not present in the text`;

      const completionResponse = await plugin.openai.chat([
        {
          role: "system",
          content:
            "You are a strict research assistant evaluating if questions have been thoroughly answered. You must respond with only a JSON array of boolean values, with no additional formatting, markdown, or explanation. Be conservative - only mark a question as answered if the text provides a complete, clear answer. Example response: [true, false, true]",
        },
        { role: "user", content: completionPrompt },
      ]);

      // Clean the response of any markdown formatting
      const cleanJson = completionResponse
        .replace(/```json\n?|\n?```/g, "")
        .trim();
      const completedStates: boolean[] = JSON.parse(cleanJson);

      // Create a map of quest IDs to their completion status
      const completionMap = new Map(
        currentActiveQuests.map((quest, index) => [
          quest.id,
          completedStates[index],
        ])
      );

      // Update only the quests that were checked
      const updated = quests.map((quest) => {
        if (
          !quest.isCompleted &&
          completionMap.has(quest.id) &&
          completionMap.get(quest.id)
        ) {
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
