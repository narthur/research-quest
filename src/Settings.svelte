<script lang="ts">
  import { App, PluginSettingTab } from "obsidian";
  import type ResearchQuest from "./index";

  export let plugin: ResearchQuest;

  let apiKey = plugin.settings?.OPENAI_API_KEY || '';

  async function saveSettings() {
    if (plugin.settings) {
      plugin.settings.OPENAI_API_KEY = apiKey;
      await plugin.saveSettings();
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
