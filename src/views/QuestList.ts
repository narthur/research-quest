import { ItemView, WorkspaceLeaf } from "obsidian";

import QuestListComponent from "./QuestList.svelte";

export const VIEW_TYPE_QUEST_LIST = "quest-list-view";

export class QuestList extends ItemView {
  component: QuestListComponent | undefined;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE_QUEST_LIST;
  }

  getDisplayText() {
    return "Quest List";
  }

  async onOpen() {
    const props = {
      variable: 1,
    };

    this.component = new QuestListComponent({
      target: this.contentEl,
      props,
    });
  }

  async onClose() {
    this.component?.$destroy();
  }
}
