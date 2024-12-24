<script lang="ts">
  export let activeCount: number;
  export let completedCount: number;
  export let dismissedCount: number;
</script>

<div class="quest-stats">
  <div class="stat-item">
    <span class="stat-value">{activeCount}</span>
    <span class="stat-label">Active</span>
  </div>
  <div class="stat-item">
    <span class="stat-value">{completedCount}</span>
    <span class="stat-label">Completed</span>
  </div>
  <div class="stat-item">
    <span class="stat-value">{dismissedCount}</span>
    <span class="stat-label">Dismissed</span>
  </div>
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
</style>
