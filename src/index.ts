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
  SEARCH_ENGINE: "google" | "bing" | "duckduckgo" | "perplexity";
}

export const DEFAULT_SETTINGS: Omit<ResearchQuestSettings, "OPENAI_API_KEY"> = {
  MODEL: "gpt-4",
  SEARCH_ENGINE: "google",
  GENERATE_PROMPT:
    `You are a research assistant helping to generate focused research questions. Your questions must be concise and specific.

Guidelines:
1. Keep questions under 15 words
2. Focus on gaps in understanding and unexplored areas
3. Build on existing knowledge
4. Connect different concepts
5. Challenge key assumptions
6. Identify contradictions

Avoid:
- Compound questions (use multiple shorter questions instead)
- Vague or broad questions
- Questions that can be answered with yes/no
- Redundant words or phrases`,
  EVALUATE_PROMPT: `You are a strict research assistant evaluating if questions have been thoroughly answered.

Mark as answered ONLY if:
- Text directly addresses the specific question
- Answer is complete with supporting evidence
- All parts of the question are addressed

Mark as NOT answered if:
- Answer is partial or implied
- Text only tangentially relates
- Supporting evidence is missing
- Question requires unavailable information`,
  BREAKDOWN_PROMPT:
    `You are a research assistant breaking down complex questions into focused sub-questions.

Each sub-question must be:
- More specific than the parent
- Under 15 words
- Answerable with available information
- Focused on a single concept or relationship`,
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
