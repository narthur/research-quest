<script lang="ts">
  import { Notice } from "obsidian";
  import type ResearchQuest from "../index";

  export let plugin: ResearchQuest;

  let apiKey = plugin.settings?.OPENAI_API_KEY || "";

  async function saveSettings() {
    if (plugin.settings) {
      plugin.settings.OPENAI_API_KEY = apiKey;
      await plugin.saveSettings();
    }
  }

  async function clearData() {
    const shouldClear = await new Promise(resolve => {
      plugin.app.modal.createConfirmModal({
        title: "Clear Data",
        content: "Are you sure you want to clear all research quests? This action cannot be undone.",
        onAccept: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });

    if (shouldClear) {
      await plugin.storage.saveQuests([]);
      new Notice("Research quests cleared");
    }
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
    <button
      on:click={clearData}
    >
      Clear All Data
    </button>
  </div>
</div>
