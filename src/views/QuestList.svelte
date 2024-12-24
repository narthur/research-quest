<script lang="ts">
  import type ResearchQuest from "../index";
  import type { Quest } from "../services/storage";
  import { onMount } from "svelte";

  export let plugin: ResearchQuest;

  let quests: Quest[] = [];
  let isLoading = false;

  async function loadQuests() {
    const storage = plugin.storage;
    if (storage) {
      quests = await storage.getQuests();
    }
  }

  async function generateNewQuests() {
    if (!plugin.openai) {
      console.error("OpenAI API key not configured");
      return;
    }

    const activeFile = plugin.app.workspace.getActiveFile();
    if (!activeFile) {
      console.log("No active file");
      return;
    }

    isLoading = true;
    try {
      const fileContent = await plugin.app.vault.read(activeFile);
      const currentActiveQuests = quests.filter(q => !q.isCompleted);
      const numQuestsNeeded = 5 - currentActiveQuests.length;

      if (numQuestsNeeded > 0) {
        const prompt = `Given the following text, generate ${numQuestsNeeded} specific research questions that would help deepen understanding of the topic. Format the response as a JSON array of strings, each string being a question:\n\n${fileContent}`;

        const response = await plugin.openai.chat([
          { 
            role: 'system', 
            content: 'You are a research assistant helping to generate focused research questions. You must respond with only a JSON array of strings, with no additional formatting, markdown, or explanation. Example response: ["Question 1?", "Question 2?"]'
          },
          { role: 'user', content: prompt }
        ]);

        // Clean the response of any markdown formatting
        const cleanJson = response.replace(/```json\n?|\n?```/g, '').trim();
        const newQuestions: string[] = JSON.parse(cleanJson);
        const newQuests: Quest[] = newQuestions.map(question => ({
          id: crypto.randomUUID(),
          question,
          isCompleted: false,
          createdAt: Date.now()
        }));

        quests = [...quests, ...newQuests];
        await plugin.storage.saveQuests(quests);
      }

      // Check for completed quests
      if (currentActiveQuests.length > 0) {
        const completionPrompt = `Given the following text, determine if each research question has been thoroughly answered. A question is only considered answered if the text provides a clear, complete response to the question. Respond with a JSON array of boolean values matching the order of the questions.

Text:
${fileContent}

Questions:
${currentActiveQuests.map((q, i) => `${i + 1}. ${q.question}`).join('\n')}

Consider a question answered (true) only if:
- The text directly addresses all aspects of the question
- The answer is substantive and complete
- There is clear evidence in the text supporting the answer

Return false if:
- The answer is partial or incomplete
- The text only tangentially relates to the question
- The question requires information not present in the text`;

        const completionResponse = await plugin.openai.chat([
          { 
            role: 'system', 
            content: 'You are a strict research assistant evaluating if questions have been thoroughly answered. You must respond with only a JSON array of boolean values, with no additional formatting, markdown, or explanation. Be conservative - only mark a question as answered if the text provides a complete, clear answer. Example response: [true, false, true]'
          },
          { role: 'user', content: completionPrompt }
        ]);

        // Clean the response of any markdown formatting
        const cleanJson = completionResponse.replace(/```json\n?|\n?```/g, '').trim();
        const completedStates: boolean[] = JSON.parse(cleanJson);
        
        // Create a map of quest IDs to their completion status
        const completionMap = new Map(
          currentActiveQuests.map((quest, index) => [quest.id, completedStates[index]])
        );
        
        // Update only the quests that were checked
        quests = quests.map(quest => {
          if (!quest.isCompleted && completionMap.has(quest.id) && completionMap.get(quest.id)) {
            return {
              ...quest,
              isCompleted: true,
              completedAt: Date.now()
            };
          }
          return quest;
        });
      }

      await plugin.storage.saveQuests(quests);
    } catch (error) {
      console.error('Error refreshing quests:', error);
    } finally {
      isLoading = false;
    }
  }

  function handleRefresh() {
    generateNewQuests();
  }

  onMount(() => {
    loadQuests();
  });

  $: activeFile = plugin.app.workspace.getActiveFile()?.basename || "No file open";
  $: activeQuests = quests.filter(q => !q.isCompleted);
  $: completedQuests = quests.filter(q => q.isCompleted);
  $: hasOpenAIKey = !!plugin.openai;
</script>

<div class="quest-list">
  {#if !hasOpenAIKey}
    <div class="notice">
      <p>Please add your OpenAI API key in settings to enable AI-powered research questions.</p>
      <button 
        on:click={() => {
          plugin.app.setting.open();
          plugin.app.setting.openTabById('research-quest');
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
          plugin.app.setting.openTabById('research-quest');
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
      {isLoading ? 'Loading...' : 'Refresh'}
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
