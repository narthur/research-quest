import type ResearchQuest from "..";
import type { Quest } from "../services/storage";
import { generateContextHash } from "./generateContextHash";

export async function validateQuestions(
  plugin: ResearchQuest,
  quests: Quest[],
  fileContent: string
): Promise<Quest[]> {
  const currentHash = await generateContextHash(fileContent);

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
