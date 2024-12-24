<script lang="ts">
  import type ResearchQuest from "../index";
  import type { Quest } from "../services/storage";
  import { onMount } from "svelte";
  import generateNewQuests from "../generateNewQuests.js";

  export let plugin: ResearchQuest;

  let quests: Quest[] = [];
  let isLoading = false;

  async function loadQuests() {
    const storage = plugin.storage;
    if (storage) {
      quests = await storage.getQuests();
    }
  }

  function handleRefresh() {
    isLoading = true;
    generateNewQuests(plugin).then(() => {
      isLoading = false;
    });
  }

  onMount(() => {
    loadQuests();
  });

  // Watch for changes in OpenAI service availability
  $: if (hasOpenAIKey) {
    loadQuests();
  }

  $: activeFile =
    plugin.app.workspace.getActiveFile()?.basename || "No file open";
  $: activeQuests = quests.filter((q) => !q.isCompleted);
  $: completedQuests = quests.filter((q) => q.isCompleted);
  $: hasOpenAIKey = !!plugin.openai;
</script>

<div class="quest-list">
  {#if !hasOpenAIKey}
    <div class="notice">
      <p>
        Please add your OpenAI API key in settings to enable AI-powered research
        questions.
      </p>
      <button
        on:click={() => {
          plugin.app.setting.open();
          plugin.app.setting.openTabById("research-quest");
        }}
      >
        Open Settings
      </button>
    </div>
  {/if}

  <div class="active-file">
    <span class="label">Current document:</span>
    <span class="value">{activeFile}</span>
  </div>

  <div class="quest-list-header">
    <div class="header-left">
      <h3>Research Questions</h3>
      <button
        class="settings-button"
        on:click={() => {
          plugin.app.setting.open();
          plugin.app.setting.openTabById("research-quest");
        }}
        aria-label="Open settings"
      >
        ⚙️
      </button>
    </div>
    <button
      class="refresh-button"
      on:click={handleRefresh}
      disabled={isLoading || !hasOpenAIKey}
    >
      {isLoading ? "Loading..." : "Refresh"}
    </button>
  </div>

  <div class="quest-section">
    <h4>Active Quests</h4>
    <div class="quest-list-content">
      {#each activeQuests as quest}
        <div class="quest-item">
          <span>{quest.question}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="quest-section">
    <h4>Completed Quests</h4>
    <div class="quest-list-content completed">
      {#each completedQuests as quest}
        <div class="quest-item completed">
          <span>{quest.question}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .quest-list {
    padding: 1rem;
  }

  .notice {
    margin-bottom: 1rem;
    padding: 1rem;
    background-color: var(--background-secondary);
    border-radius: 4px;
    border: 1px solid var(--interactive-accent);
  }

  .notice p {
    margin: 0 0 0.5rem 0;
  }

  .active-file {
    margin-bottom: 1rem;
    padding: 0.5rem;
    background-color: var(--background-secondary);
    border-radius: 4px;
  }

  .active-file .label {
    color: var(--text-muted);
    margin-right: 0.5rem;
  }

  .quest-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .settings-button {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    border-radius: 4px;
  }

  .settings-button:hover {
    background-color: var(--background-secondary);
  }

  .quest-list-header h3 {
    margin: 0;
  }

  .refresh-button {
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
  }

  .refresh-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .quest-section {
    margin-bottom: 2rem;
  }

  .quest-section h4 {
    margin: 0.5rem 0;
    color: var(--text-muted);
  }

  .quest-list-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .quest-item {
    padding: 0.5rem;
    border-radius: 4px;
    background-color: var(--background-secondary);
  }

  .quest-item:hover {
    background-color: var(--background-secondary-alt);
  }

  .quest-item.completed {
    opacity: 0.7;
  }

  .quest-item.completed span {
    text-decoration: line-through;
  }
</style>
