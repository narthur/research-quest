<script lang="ts">
  const activeQuests = [
    "What are the key factors that influence climate change?",
    "How does artificial intelligence impact modern healthcare?",
    "What role did trade routes play in ancient civilizations?",
    "How do quantum computers differ from classical computers?",
    "What are the major theories about consciousness?"
  ];

  const completedQuests = [
    "What caused the fall of the Roman Empire?",
    "How do plants communicate with each other?",
    "What is the significance of dark matter in the universe?"
  ];

  function handleRefresh() {
    // TODO: Implement refresh logic
    console.log("Refresh clicked");
  }
</script>

<div class="quest-list">
  <div class="quest-list-header">
    <h3>Research Questions</h3>
    <button class="refresh-button" on:click={handleRefresh}>
      Refresh
    </button>
  </div>
  
  <div class="quest-section">
    <h4>Active Quests</h4>
    <div class="quest-list-content">
      {#each activeQuests as quest}
        <div class="quest-item">
          <span>{quest}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="quest-section">
    <h4>Completed Quests</h4>
    <div class="quest-list-content completed">
      {#each completedQuests as quest}
        <div class="quest-item completed">
          <span>{quest}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .quest-list {
    padding: 1rem;
  }

  .quest-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .quest-list-header h3 {
    margin: 0;
  }

  .refresh-button {
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
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
