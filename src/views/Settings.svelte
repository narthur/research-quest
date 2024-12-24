<script lang="ts">
  import { Notice, App } from "obsidian";
  import type ResearchQuest from "../index";
  import ClearConfirmModal from "./ClearConfirmModal.js";

  export let app: App;
  export let plugin: ResearchQuest;

  let apiKey = plugin.settings?.OPENAI_API_KEY || "";
  let model = plugin.settings?.MODEL || "gpt-4";
  let models: string[] = [];
  let loading = false;

  async function saveSettings() {
    if (plugin.settings) {
      plugin.settings.OPENAI_API_KEY = apiKey;
      plugin.settings.MODEL = model;
      await plugin.saveSettings();
    }
  }

  async function loadModels() {
    if (!plugin.openai) return;
    
    loading = true;
    try {
      const response = await plugin.openai.client.models.list();
      models = response.data
        .map(m => m.id)
        .filter(id => id.startsWith('gpt'))
        .sort();
    } catch (error) {
      console.error('Failed to load models:', error);
      new Notice('Failed to load available models');
    } finally {
      loading = false;
    }
  }

  async function clearData() {
    const modal = new ClearConfirmModal(app, (shouldClear) => {
      if (!shouldClear) return;
      plugin.storage
        .saveQuests([])
        .then(() => {
          new Notice("Research Quests plugin data cleared");
        })
        .catch((e) => {
          new Notice("Failed to clear Research Quests plugin data");
        });
    });
    modal.open();
  }

  $: if (plugin.openai) {
    loadModels();
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
    <div class="setting-item-name">Model</div>
    <div class="setting-item-description">
      Select the OpenAI model to use
    </div>
  </div>
  <div class="setting-item-control">
    <select bind:value={model} on:change={saveSettings} disabled={loading}>
      {#each models as modelOption}
        <option value={modelOption}>{modelOption}</option>
      {/each}
    </select>
    {#if loading}
      <span>Loading models...</span>
    {/if}
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
