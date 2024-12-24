export interface Quest {
  id: string;
  question: string;
  isCompleted: boolean;
  createdAt: number;
  completedAt?: number;
  documentId: string;  // Add document ID
  documentPath: string;  // Add document path for reference
}

export class StorageService {
  private plugin: any;
  private QUESTS_KEY = 'quests';

  constructor(plugin: any) {
    this.plugin = plugin;
  }

  async getQuests(): Promise<Quest[]> {
    const data = await this.plugin.loadData();
    return data?.[this.QUESTS_KEY] || [];
  }

  async getQuestsForDocument(documentId: string): Promise<Quest[]> {
    const quests = await this.getQuests();
    return quests.filter(quest => quest.documentId === documentId);
  }

  async saveQuests(quests: Quest[]): Promise<void> {
    const data = await this.plugin.loadData() || {};
    data[this.QUESTS_KEY] = quests;
    await this.plugin.saveData(data);
  }
}
