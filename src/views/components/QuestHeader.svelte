<script lang="ts">
  export let onRefresh: () => void;
  export let onOpenSettings: () => void;
  export let isLoading: boolean;
  export let hasOpenAIKey: boolean;
</script>

<div class="quest-list-header">
  <div class="header-left">
    <h3>Research Questions</h3>
    <button
      class="settings-button"
      on:click={onOpenSettings}
      aria-label="Open settings"
    >
      ⚙️
    </button>
  </div>
  <button
    class="refresh-button"
    on:click={onRefresh}
    disabled={isLoading || !hasOpenAIKey}
  >
    {isLoading ? "Loading..." : "Refresh"}
  </button>
</div>

<style>
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
</style>
