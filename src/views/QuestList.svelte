<script lang="ts">
  import type ResearchQuest from "../index";
  import type { Quest } from "../services/storage";
  import { onMount } from "svelte";
  import refreshQuests from "../lib/refreshQuests.js";
  import { Notice } from "obsidian";
  import QuestStats from "./components/QuestStats.svelte";
  import QuestSection from "./components/QuestSection.svelte";
  import QuestHeader from "./components/QuestHeader.svelte";
  import { extractContext } from "../lib/extractContext";
  import { generateContextHash } from "../lib/generateContextHash";

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
    refreshQuests(plugin).finally(() => {
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

  async function copyActiveQuestsAsMarkdown() {
    const markdown = activeQuests
      .map((q) => {
        // Add indentation for sub-questions
        const indent = q.parentId ? "    " : "";
        return `${indent}- ${q.question}`;
      })
      .join("\n");

    await navigator.clipboard.writeText(markdown);
    new Notice("Copied questions to clipboard");
  }

  async function regenerateQuest(quest: Quest) {
    if (!plugin.openai) return;

    const activeFile = plugin.app.workspace.getActiveFile();
    if (!activeFile) return;

    isLoading = true;
    try {
      const fileContent = await plugin.app.vault.read(activeFile);
      const newQuestions = await plugin.openai.generateQuestions(
        fileContent,
        1
      );

      if (newQuestions.length === 0) return;

      const contextSnapshot = await extractContext(fileContent, newQuestions[0], plugin.openai);
      const updatedQuests = quests.map((q) => {
        if (q.id === quest.id) {
          return {
            ...q,
            question: newQuestions[0],
            isObsolete: false,
            contextHash: generateContextHash(fileContent),
            contextSnapshot,
            lastValidated: Date.now(),
          };
        }
        return q;
      });

      await plugin.storage.saveQuests(updatedQuests);
      quests = updatedQuests;
    } catch (error) {
      console.error("Error regenerating quest:", error);
    } finally {
      isLoading = false;
    }
  }

  $: activeFile = plugin.app.workspace.getActiveFile()?.path || "No file open";
  $: activeQuests = quests
    .filter((q) => !q.isCompleted && !q.isDismissed && !q.isObsolete)
    .sort((a, b) => {
      // Keep questions with same parent together
      if (a.parentId !== b.parentId) {
        // If one has a parent and other doesn't
        if (!a.parentId && b.parentId) return -1;
        if (a.parentId && !b.parentId) return 1;
        // Different parents - sort by parent's position
        if (a.parentId && b.parentId) {
          const aParentIndex = quests.findIndex(q => q.id === a.parentId);
          const bParentIndex = quests.findIndex(q => q.id === b.parentId);
          return aParentIndex - bParentIndex;
        }
      }
      // Same parent (or both root) - sort by creation time
      return a.createdAt - b.createdAt;
    });
  $: hasActiveQuests = activeQuests.length > 0;
  $: completedQuests = quests.filter((q) => q.isCompleted && !q.isDismissed);
  $: dismissedQuests = quests.filter((q) => q.isDismissed);
  $: hasOpenAIKey = !!plugin.openai;
  $: obsoleteQuests = quests.filter((q) => q.isObsolete && !q.isDismissed);
</script>

<div class="quest-list">
  {#if !hasOpenAIKey}
    <div class="notice">
      <p>
        Please add your OpenAI API key in settings to enable AI-powered research
        questions.
      </p>
      <button on:click={openSettings}>Open Settings</button>
    </div>
  {/if}

  <QuestHeader
    onRefresh={handleRefresh}
    onOpenSettings={openSettings}
    {isLoading}
    {hasOpenAIKey}
  />

  <QuestStats
    activeCount={activeQuests.length}
    completedCount={completedQuests.length}
    dismissedCount={dismissedQuests.length}
  />

  <div class="active-file">
    <span class="label">Current document:</span>
    <span class="value">{activeFile}</span>
  </div>

  {#if obsoleteQuests.length > 0}
    <QuestSection
      title="Needs Review"
      quests={obsoleteQuests}
      type="obsolete"
      onDismiss={dismissQuest}
      onRegenerate={regenerateQuest}
      {plugin}
    />
  {/if}    <QuestSection
      title="Active Quests"
      quests={activeQuests}
      type="active"
      onDismiss={dismissQuest}
      onBreakdown={breakdownQuest}
      showCopyButton={hasActiveQuests}
      onCopy={copyActiveQuestsAsMarkdown}
      {plugin}
    />

  <QuestSection
    title="Completed Quests"
    quests={completedQuests}
    type="completed"
    onDismiss={dismissQuest}
    {plugin}
  />

  {#if dismissedQuests.length > 0}
    <QuestSection
      title="Dismissed"
      quests={dismissedQuests}
      type="dismissed"
      onDismiss={dismissQuest}
      {plugin}
    />
  {/if}
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
</style>
