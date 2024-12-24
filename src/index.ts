import { Plugin, WorkspaceLeaf } from "obsidian";
import { ExampleView, VIEW_TYPE_EXAMPLE } from "./ExampleView.js";
import { Settings } from "./Settings.js";

interface ResearchQuestSettings {
  OPENAI_API_KEY: string;
}

const DEFAULT_SETTINGS: Partial<ResearchQuestSettings> = {};

export default class ResearchQuest extends Plugin {
  settings: ResearchQuestSettings | undefined;

  async onload() {
    console.log("loading plugin");

    await this.loadSettings();

    this.addSettingTab(new Settings(this.app, this));

    this.registerView(VIEW_TYPE_EXAMPLE, (leaf) => new ExampleView(leaf));

    this.addRibbonIcon("sparkles", "Activate view", () => {
      this.activateView();
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async onunload() {
    console.log("unloading plugin");
  }

  async activateView() {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE);

    if (leaves.length > 0) {
      // A leaf with our view already exists, use that
      leaf = leaves[0];
    } else {
      // Our view could not be found in the workspace, create a new leaf
      // in the right sidebar for it
      leaf = workspace.getRightLeaf(false);
      await leaf?.setViewState({ type: VIEW_TYPE_EXAMPLE, active: true });
    }

    // "Reveal" the leaf in case it is in a collapsed sidebar
    if (leaf) workspace.revealLeaf(leaf);
  }
}
