import { App, Modal, Notice, Setting } from "obsidian";

export default class ClearConfirmModal extends Modal {
  constructor(app: App, onSubmit: (shouldClear: boolean) => void) {
    super(app);

    this.setContent(
      "Are you sure you want to clear all data for the Research Quest plugin?"
    );

    new Setting(this.contentEl).addButton((btn) =>
      btn
        .setButtonText("Clear data")
        .setCta()
        .onClick(async () => {
          onSubmit(true);
          this.close();
        })
    );

    new Setting(this.contentEl).addButton((btn) =>
      btn.setButtonText("Cancel").onClick(() => {
        this.close();
      })
    );
  }
}
