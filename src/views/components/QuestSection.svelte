<script lang="ts">
  import type { Quest } from "../../services/storage";
  import type ResearchQuest from "../../index";

  export let plugin: ResearchQuest;

  export let title: string;
  export let quests: Quest[];
  export let onDismiss: (id: string) => void;
  export let onBreakdown: ((quest: Quest) => void) | undefined = undefined;
  export let onRegenerate: ((quest: Quest) => void) | undefined = undefined;
  export let showCopyButton = false;
  export let onCopy: (() => void) | undefined = undefined;
  export let type: "active" | "completed" | "dismissed" | "obsolete" = "active";
</script>

<div class="quest-section">
  <div class="section-header">
    <h4>{title}</h4>
    {#if showCopyButton && quests.length > 0}
      <button
        class="copy-button"
        on:click={onCopy}
        title="Copy as markdown"
        aria-label="Copy questions as markdown"
      >
        📋
      </button>
    {/if}
  </div>
  <div class="quest-list-content {type}">
    {#if quests.length > 0}
      {#each quests as quest}
        <div 
          class="quest-item {type} {quest.isParentQuestion ? 'parent-question' : ''} {quest.parentId ? 'sub-question' : ''}"
          class:completed={type === 'completed'}
          class:obsolete={type === 'obsolete'}
        >
          <div class="quest-content">
            <span>{quest.question}</span>
            {#if quest.isObsolete}
              <div class="obsolete-badge" title={quest.obsoleteReason}>
                Obsolete
              </div>
            {/if}
          </div>
          {#if type === "active" || type === "obsolete"}
            <div class="quest-actions">
              {#if type === "active"}
                <button
                  class="action-button"
                  on:click={() => {
                    const searchUrls = {
                      google: `https://www.google.com/search?q=`,
                      bing: `https://www.bing.com/search?q=`,
                      duckduckgo: `https://duckduckgo.com/?q=`,
                      perplexity: `https://www.perplexity.ai/?q=`,
                    };
                    const baseUrl = searchUrls[plugin.settings?.SEARCH_ENGINE || 'google'];
                    window.open(baseUrl + encodeURIComponent(quest.question), '_blank');
                  }}
                  aria-label="Search on Google"
                  title="Search on Google"
                >
                  🔍
                </button>
                {#if onBreakdown}
                  <button
                    class="action-button"
                    on:click={() => onBreakdown(quest)}
                    aria-label="Break down into sub-questions"
                    title="Break down into sub-questions"
                  >
                    ↳
                  </button>
                {/if}
              {/if}
              {#if type === "obsolete" && onRegenerate}
                <button
                  class="action-button"
                  on:click={() => onRegenerate(quest)}
                  aria-label="Regenerate question"
                  title="Regenerate question"
                >
                  🔄
                </button>
              {/if}
              <button
                class="dismiss-button"
                on:click={() => onDismiss(quest.id)}
                aria-label="Dismiss question"
              >
                ✕
              </button>
            </div>
          {/if}
        </div>
      {/each}
    {:else if type === "active"}
      <div class="empty-state">
        <p class="empty-text">Click refresh to generate research questions for this document</p>
      </div>
    {:else if type === "obsolete"}
      <div class="empty-state">
        <p class="empty-text">No questions need review</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .quest-section {
    margin-bottom: 2rem;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .section-header h4 {
    margin: 0;
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
    transition: background-color 0.2s ease;
  }

  .quest-item:hover {
    background-color: var(--background-secondary-alt);
  }

  .quest-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
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
  .dismiss-button,
  .copy-button {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  .action-button:hover,
  .dismiss-button:hover,
  .copy-button:hover {
    background-color: var(--background-modifier-hover);
    color: var(--text-normal);
  }

  /* Make search button more prominent */
  .action-button[title="Search on Google"]:hover {
    background-color: var(--interactive-accent);
    color: var(--text-on-accent);
  }

  .copy-button {
    font-size: 0.9em;
    opacity: 0.7;
  }

  .copy-button:hover {
    opacity: 1;
  }

  .quest-item.parent-question {
    border-left: 2px solid var(--interactive-accent);
    padding-left: 0.75rem;
  }

  .quest-item.sub-question {
    margin-left: 1rem;
    font-size: 0.95em;
  }

  .quest-item.completed span {
    text-decoration: line-through;
    opacity: 0.7;
  }

  .quest-item.obsolete {
    border-left: 2px solid var(--text-muted);
  }

  .obsolete-badge {
    font-size: 0.8em;
    padding: 2px 6px;
    border-radius: 4px;
    background-color: var(--text-muted);
    color: var(--background-primary);
    opacity: 0.8;
  }

  .empty-state {
    padding: 1rem;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
    background-color: var(--background-secondary);
    border-radius: 4px;
    position: relative;  /* Instead of absolute */
    margin: 0.5rem 0;
  }

  .empty-text {
    margin: 0;
    font-size: 0.9em;
  }
</style>
