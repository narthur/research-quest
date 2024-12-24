import { Plugin, WorkspaceLeaf } from "obsidian";
import { QuestList, VIEW_TYPE_QUEST_LIST } from "./views/QuestList.js";
import { Settings } from "./views/Settings.js";
import { OpenAIService, createOpenAIService } from "./services/openai";
import { StorageService } from "./services/storage";
import { EventEmitter } from "./services/events";

interface ResearchQuestSettings {
  OPENAI_API_KEY: string;
  MODEL: string;
  GENERATE_PROMPT: string;
  EVALUATE_PROMPT: string;
  BREAKDOWN_PROMPT: string;
}

export const DEFAULT_SETTINGS: Omit<ResearchQuestSettings, "OPENAI_API_KEY"> = {
  MODEL: "gpt-4",
  GENERATE_PROMPT:
    "You are a research assistant helping to generate focused research questions.",
  EVALUATE_PROMPT: `You are a strict research assistant evaluating if questions have been thoroughly answered. 
Only mark a question as answered if the text provides a complete, clear answer with supporting evidence.
A question is NOT answered if:
- The answer is partial or incomplete
- The text only tangentially relates to the question
- The question requires information not present in the text`,
  BREAKDOWN_PROMPT:
    "You are a research assistant helping to break down complex research questions into more specific, focused sub-questions.",
};

export default class ResearchQuest extends Plugin {
  settings: ResearchQuestSettings | undefined;
  openai: OpenAIService | undefined;
  storage!: StorageService;
  events!: EventEmitter;

  async onload() {
    this.events = new EventEmitter();
    this.storage = new StorageService(this);

    await this.loadSettings();

    this.addSettingTab(new Settings(this.app, this));

    this.registerView(
      VIEW_TYPE_QUEST_LIST,
      (leaf) => new QuestList(leaf, this)
    );

    this.addRibbonIcon("microscope", "Open: Research Quests", () => {
      this.activateView();
    });

    // Register event listener for active leaf changes
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        // Emit an event that our QuestList component can listen to
        this.events.emit("active-leaf-changed");
      })
    );
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (this.settings?.OPENAI_API_KEY) {
      this.openai = createOpenAIService(
        this.settings.OPENAI_API_KEY,
        this.settings.MODEL,
        {
          generatePrompt: this.settings.GENERATE_PROMPT,
          evaluatePrompt: this.settings.EVALUATE_PROMPT,
          breakdownPrompt: this.settings.BREAKDOWN_PROMPT,
        }
      );
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
    if (this.settings?.OPENAI_API_KEY) {
      this.openai = createOpenAIService(
        this.settings.OPENAI_API_KEY,
        this.settings.MODEL,
        {
          generatePrompt: this.settings.GENERATE_PROMPT,
          evaluatePrompt: this.settings.EVALUATE_PROMPT,
          breakdownPrompt: this.settings.BREAKDOWN_PROMPT,
        }
      );
    } else {
      this.openai = undefined;
    }
  }

  async onunload() {
    // TODO: Implement onunload
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

  async saveData(data: unknown): Promise<void> {
    const result = await super.saveData(data);
    this.events.emit("data-updated", data);
    return result;
  }
}
