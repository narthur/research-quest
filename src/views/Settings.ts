import { App, PluginSettingTab } from "obsidian";
import type ResearchQuest from "../index";
import SettingsComponent from "./Settings.svelte";

export class Settings extends PluginSettingTab {
  component: SettingsComponent | undefined;
  plugin: ResearchQuest;

  constructor(app: App, plugin: ResearchQuest) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    this.component = new SettingsComponent({
      target: containerEl,
      props: {
        plugin: this.plugin
      }
    });
  }

  hide(): void {
    this.component?.$destroy();
  }
}
