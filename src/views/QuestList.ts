import { ItemView, WorkspaceLeaf } from "obsidian";
import type ResearchQuest from "../index";
import QuestListComponent from "./QuestList.svelte";

export const VIEW_TYPE_QUEST_LIST = "quest-list-view";

export class QuestList extends ItemView {
  component: QuestListComponent | undefined;
  plugin: ResearchQuest;

  constructor(leaf: WorkspaceLeaf, plugin: ResearchQuest) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_QUEST_LIST;
  }

  getDisplayText() {
    return "Quest List";
  }

  async onOpen() {
    this.component = new QuestListComponent({
      target: this.contentEl,
      props: {
        plugin: this.plugin
      }
    });
  }

  async onClose() {
    this.component?.$destroy();
  }
}
