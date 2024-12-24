import type ResearchQuest from "../..";

export interface Quest {
  id: string;
  question: string;
  isCompleted: boolean;
  isDismissed: boolean;
  createdAt: number;
  completedAt?: number;
  dismissedAt?: number;
  documentId: string;
  documentPath: string;
  parentId?: string; // Add parent question ID for hierarchical questions
  isParentQuestion?: boolean; // Flag to identify questions that have been broken down
}

export class StorageService {
  private plugin: ResearchQuest;
  private QUESTS_KEY = "quests";

  constructor(plugin: ResearchQuest) {
    this.plugin = plugin;
  }

  async getQuests(): Promise<Quest[]> {
    const data = await this.plugin.loadData();
    return data?.[this.QUESTS_KEY] || [];
  }

  async getQuestsForDocument(documentId: string): Promise<Quest[]> {
    const quests = await this.getQuests();
    return quests.filter((quest) => quest.documentId === documentId);
  }

  async saveQuests(quests: Quest[]): Promise<void> {
    const data = (await this.plugin.loadData()) || {};
    data[this.QUESTS_KEY] = quests;
    await this.plugin.saveData(data);
  }
}
