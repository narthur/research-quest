<script lang="ts">
  import { Notice, App } from "obsidian";
  import type ResearchQuest from "../index";
  import ClearConfirmModal from "./ClearConfirmModal.js";
  import { DEFAULT_SETTINGS } from "../index";

  export let app: App;
  export let plugin: ResearchQuest;

  let apiKey = plugin.settings?.OPENAI_API_KEY || "";
  let model = plugin.settings?.MODEL || "gpt-4";
  let searchEngine = plugin.settings?.SEARCH_ENGINE || "google";
  let generatePrompt = plugin.settings?.GENERATE_PROMPT || "";
  let evaluatePrompt = plugin.settings?.EVALUATE_PROMPT || "";
  let breakdownPrompt = plugin.settings?.BREAKDOWN_PROMPT || "";
  let models: string[] = [];
  let loading = false;

  async function saveSettings() {
    if (plugin.settings) {
      plugin.settings.OPENAI_API_KEY = apiKey;
      plugin.settings.MODEL = model;
      plugin.settings.SEARCH_ENGINE = searchEngine;
      plugin.settings.GENERATE_PROMPT = generatePrompt;
      plugin.settings.EVALUATE_PROMPT = evaluatePrompt;
      plugin.settings.BREAKDOWN_PROMPT = breakdownPrompt;
      await plugin.saveSettings();
    }
  }

  async function loadModels() {
    if (!plugin.openai) return;

    loading = true;
    try {
      const response = await plugin.openai.client.models.list();
      models = response.data
        .map((m) => m.id)
        .filter((id) => id.startsWith("gpt"))
        .sort();
    } catch (error) {
      console.error("Failed to load models:", error);
      new Notice("Failed to load available models");
    } finally {
      loading = false;
    }
  }

  async function resetToDefaults() {
    if (plugin.settings) {
      // Keep the API key, reset everything else
      const currentApiKey = plugin.settings.OPENAI_API_KEY;
      plugin.settings = { ...DEFAULT_SETTINGS, OPENAI_API_KEY: currentApiKey };
      await plugin.saveSettings();

      // Update local state
      model = plugin.settings.MODEL;
      generatePrompt = plugin.settings.GENERATE_PROMPT;
      evaluatePrompt = plugin.settings.EVALUATE_PROMPT;
      breakdownPrompt = plugin.settings.BREAKDOWN_PROMPT;

      new Notice("Settings reset to defaults");
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
    <div class="setting-item-name">Generate Questions Prompt</div>
    <div class="setting-item-description">
      System prompt for generating research questions
    </div>
  </div>
  <div class="setting-item-control">
    <textarea
      bind:value={generatePrompt}
      on:change={saveSettings}
      rows="3"
      style="width: 100%;"
    ></textarea>
  </div>
</div>

<div class="setting-item">
  <div class="setting-item-info">
    <div class="setting-item-name">Evaluate Questions Prompt</div>
    <div class="setting-item-description">
      System prompt for evaluating if questions are answered
    </div>
  </div>
  <div class="setting-item-control">
    <textarea
      bind:value={evaluatePrompt}
      on:change={saveSettings}
      rows="5"
      style="width: 100%;"
    ></textarea>
  </div>
</div>

<div class="setting-item">
  <div class="setting-item-info">
    <div class="setting-item-name">Breakdown Questions Prompt</div>
    <div class="setting-item-description">
      System prompt for breaking down questions into sub-questions
    </div>
  </div>
  <div class="setting-item-control">
    <textarea
      bind:value={breakdownPrompt}
      on:change={saveSettings}
      rows="3"
      style="width: 100%;"
    ></textarea>
  </div>
</div>

<div class="setting-item">
  <div class="setting-item-info">
    <div class="setting-item-name">Model</div>
    <div class="setting-item-description">Select the OpenAI model to use</div>
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
    <div class="setting-item-name">Search Engine</div>
    <div class="setting-item-description">Choose which search engine to use for question searches</div>
  </div>
  <div class="setting-item-control">
    <select bind:value={searchEngine} on:change={saveSettings}>
      <option value="google">Google</option>
      <option value="bing">Bing</option>
      <option value="duckduckgo">DuckDuckGo</option>
      <option value="perplexity">Perplexity</option>
    </select>
  </div>
</div>

<div class="setting-item">
  <div class="setting-item-info">
    <div class="setting-item-name">Reset Settings</div>
    <div class="setting-item-description">
      Reset all settings to defaults (except API key)
    </div>
  </div>
  <div class="setting-item-control">
    <button on:click={resetToDefaults}>Reset to Defaults</button>
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
