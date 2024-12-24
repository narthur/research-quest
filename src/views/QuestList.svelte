<script lang="ts">
  import type ResearchQuest from "../index";
  import type { Quest } from "../services/storage";
  import { onMount } from "svelte";
  import generateNewQuests from "../generateNewQuests.js";

  export let plugin: ResearchQuest;

  let quests: Quest[] = [];
  let isLoading = false;

  function openSettings() {
    const a = plugin.app as any;
    a.setting.open();
    a.setting.openTabById("research-quest");
  }

  async function loadQuests() {
    quests = await plugin.storage.getQuestsForDocument(activeFile);
  }

  function handleRefresh() {
    isLoading = true;
    generateNewQuests(plugin).finally(() => {
      loadQuests();
      isLoading = false;
    });
  }

  onMount(() => {
    loadQuests();

    // Listen for data updates
    plugin.events.on("data-updated", () => {
      // Only reload if we're not currently generating new quests
      if (!isLoading) {
        loadQuests();
      }
    });

    // Listen for active leaf changes
    plugin.events.on("active-leaf-changed", () => {
      activeFile = plugin.app.workspace.getActiveFile()?.path || "No file open";
      loadQuests();
    });

    return () => {
      // Clean up event listeners
      plugin.events.off("data-updated", loadQuests);
      plugin.events.off("active-leaf-changed", loadQuests);
    };
  });

  // Watch for changes in OpenAI service availability
  $: if (hasOpenAIKey) {
    loadQuests();
  }

  $: activeFile = plugin.app.workspace.getActiveFile()?.path || "No file open";
  async function breakdownQuest(quest: Quest) {
    if (!plugin.openai) {
      console.error("OpenAI API key not configured");
      return;
    }

    const activeFile = plugin.app.workspace.getActiveFile();
    if (!activeFile) {
      return;
    }

    isLoading = true;
    try {
      const fileContent = await plugin.app.vault.read(activeFile);
      const subQuestions = await plugin.openai.breakdownQuestion(
        fileContent,
        quest.question
      );

      // Create new quests for sub-questions
      const newQuests = subQuestions.map((question) => ({
        id: crypto.randomUUID(),
        question,
        isCompleted: false,
        isDismissed: false,
        createdAt: Date.now(),
        documentId: activeFile.path,
        documentPath: activeFile.path,
        parentId: quest.id,
      }));

      // Mark the original quest as a parent
      const updatedQuests = quests.map((q) => {
        if (q.id === quest.id) {
          return {
            ...q,
            isParentQuestion: true,
          };
        }
        return q;
      });

      // Save all quests
      await plugin.storage.saveQuests([...updatedQuests, ...newQuests]);
      quests = [...updatedQuests, ...newQuests];
    } catch (error) {
      console.error("Error breaking down quest:", error);
    } finally {
      isLoading = false;
    }
  }

  async function dismissQuest(questId: string) {
    const updatedQuests = quests.map((q) => {
      if (q.id === questId) {
        return {
          ...q,
          isDismissed: true,
          dismissedAt: Date.now(),
        };
      }
      return q;
    });
    await plugin.storage.saveQuests(updatedQuests);
    quests = updatedQuests;
  }

  $: activeQuests = quests
    .filter((q) => !q.isCompleted && !q.isDismissed)
    .sort((a, b) => {
      // Sort parent questions before their children
      if (a.parentId && !b.parentId) return 1;
      if (!a.parentId && b.parentId) return -1;
      return 0;
    });
  $: completedQuests = quests.filter((q) => q.isCompleted && !q.isDismissed);
  $: dismissedQuests = quests.filter((q) => q.isDismissed);
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
          openSettings();
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

  <div class="quest-stats">
    <div class="stat-item">
      <span class="stat-value">{activeQuests.length}</span>
      <span class="stat-label">Active</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">{completedQuests.length}</span>
      <span class="stat-label">Completed</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">{dismissedQuests.length}</span>
      <span class="stat-label">Dismissed</span>
    </div>
  </div>

  <div class="quest-list-header">
    <div class="header-left">
      <h3>Research Questions</h3>
      <button
        class="settings-button"
        on:click={() => {
          openSettings();
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
        <div
          class="quest-item {quest.isParentQuestion
            ? 'parent-question'
            : ''} {quest.parentId ? 'sub-question' : ''}"
        >
          <span>{quest.question}</span>
          <div class="quest-actions">
            <button
              class="action-button"
              on:click={() => breakdownQuest(quest)}
              aria-label="Break down into sub-questions"
              title="Break down into sub-questions"
            >
              ↳
            </button>
            <button
              class="dismiss-button"
              on:click={() => dismissQuest(quest.id)}
              aria-label="Dismiss question"
            >
              ✕
            </button>
          </div>
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

  {#if dismissedQuests.length > 0}
    <div class="quest-section">
      <h4>Dismissed</h4>
      <div class="quest-list-content dismissed">
        {#each dismissedQuests as quest}
          <div class="quest-item dismissed">
            <span>{quest.question}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .quest-stats {
    display: flex;
    justify-content: space-around;
    padding: 1rem;
    margin: 1rem 0;
    background-color: var(--background-secondary);
    border-radius: 4px;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .stat-value {
    font-size: 1.5em;
    font-weight: bold;
    color: var(--text-accent);
  }

  .stat-label {
    font-size: 0.9em;
    color: var(--text-muted);
  }

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
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .quest-actions {
    display: flex;
    gap: 0.25rem;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .quest-item:hover .quest-actions {
    opacity: 1;
  }

  .action-button,
  .dismiss-button {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
  }

  .action-button:hover,
  .dismiss-button:hover {
    background-color: var(--background-modifier-hover);
    color: var(--text-normal);
  }

  .quest-item.parent-question {
    border-left: 2px solid var(--interactive-accent);
    padding-left: 0.75rem;
  }

  .quest-item.sub-question {
    margin-left: 1rem;
    font-size: 0.95em;
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
