# Research Quest Knowledge Base

## Project Overview

An Obsidian plugin that helps users deepen their research by generating intelligent questions and tracking their progress in answering them.

## Architecture

- `src/services/` - Core services (OpenAI, storage, events)
- `src/views/` - UI components and views
- `src/__tests__/` - Test suites

## Key Concepts

### Quest Management

- Each quest is associated with a specific document
- Maintain 5 active quests per document
- Auto-generate new quests when existing ones are completed
- Track completion status and timestamps

### OpenAI Integration

- Use function calling for reliable structured responses
- Strict evaluation criteria for marking questions as answered
- Conservative approach to completion - only mark as done when thoroughly answered

### State Management

- Use event system for cross-component communication
- Persist quests in Obsidian's data storage
- Reactive updates when document changes

## Development Guidelines

- Write tests for core functionality
- Use TypeScript for type safety
- Follow Obsidian's UI patterns and styles
- Keep components focused and single-purpose
- Use Svelte for UI components

## Testing

- Run tests before committing: `pnpm test`
- Mock external services in tests
- Test error cases and edge conditions
- Ensure proper cleanup in tests

## Resources

- [Obsidian Developer Docs](https://docs.obsidian.md/Home)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
