<script lang="ts">
  import { Notice, App } from "obsidian";
  import type ResearchQuest from "../index";
  import ClearConfirmModal from "./ClearConfirmModal.ts";

  export let app: App;
  export let plugin: ResearchQuest;

  let apiKey = plugin.settings?.OPENAI_API_KEY || "";

  async function saveSettings() {
    if (plugin.settings) {
      plugin.settings.OPENAI_API_KEY = apiKey;
      await plugin.saveSettings();
    }
  }

  async function clearData() {
    const modal = new ClearConfirmModal(app, (shouldClear) => {
      if (!shouldClear) return;
      await app.plugin.storage.saveQuests([]);
      new Notice("Research quests cleared");
    });
    modal.open();
  }
</script>

<div class="setting-item">
  <div class="setting-item-info">
    <div class="setting-item-name">OpenAI API Key</div>
    <div class="setting-item-description">
      Enter your OpenAI API key to enable AI features
    </div>
  </div>
  <div class="setting-item-control">
    <input
      type="password"
      placeholder="sk-..."
      bind:value={apiKey}
      on:change={saveSettings}
    />
  </div>
</div>

<div class="setting-item">
  <div class="setting-item-info">
    <div class="setting-item-name">Clear Data</div>
    <div class="setting-item-description">
      Remove all research quests. This action cannot be undone.
    </div>
  </div>
  <div class="setting-item-control">
    <button on:click={clearData}> Clear All Data </button>
  </div>
</div>
