import { Plugin, WorkspaceLeaf } from "obsidian";
import { QuestList, VIEW_TYPE_QUEST_LIST } from "./views/QuestList.js";
import { Settings } from "./views/Settings.js";
import { OpenAIService, createOpenAIService } from "./services/openai";
import { StorageService } from "./services/storage";
import { EventEmitter } from "./services/events";

interface ResearchQuestSettings {
  OPENAI_API_KEY: string;
}

const DEFAULT_SETTINGS: Partial<ResearchQuestSettings> = {};

export default class ResearchQuest extends Plugin {
  settings: ResearchQuestSettings | undefined;
  openai: OpenAIService | undefined;
  storage!: StorageService;
  events!: EventEmitter;

  async onload() {
    console.log("loading plugin");
    this.events = new EventEmitter();
    this.storage = new StorageService(this);

    await this.loadSettings();

    this.addSettingTab(new Settings(this.app, this));

    this.registerView(
      VIEW_TYPE_QUEST_LIST,
      (leaf) => new QuestList(leaf, this)
    );

    this.addRibbonIcon("sparkles", "Activate view", () => {
      this.activateView();
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (this.settings?.OPENAI_API_KEY) {
      this.openai = createOpenAIService(this.settings.OPENAI_API_KEY);
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
    if (this.settings?.OPENAI_API_KEY) {
      this.openai = createOpenAIService(this.settings.OPENAI_API_KEY);
    } else {
      this.openai = undefined;
    }
  }

  async onunload() {
    console.log("unloading plugin");
  }

  async activateView() {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_QUEST_LIST);

    if (leaves.length > 0) {
      // A leaf with our view already exists, use that
      leaf = leaves[0];
    } else {
      // Our view could not be found in the workspace, create a new leaf
      // in the right sidebar for it
      leaf = workspace.getRightLeaf(false);
      await leaf?.setViewState({ type: VIEW_TYPE_QUEST_LIST, active: true });
    }

    // "Reveal" the leaf in case it is in a collapsed sidebar
    if (leaf) workspace.revealLeaf(leaf);
  }

  async saveData(data: any): Promise<void> {
    console.log("saving data", data);
    const result = await super.saveData(data);
    this.events.emit('data-updated', data);
    return result;
  }
}
