# Refactor Plan: Clearer and More Testable Behavior for refreshQuests

This plan outlines how to refactor the `refreshQuests` function in order to:
• Maintain exactly 5 active questions per document.
• First evaluate existing questions before (re)generating any new ones.
• Clearly handle both the initial generation (when no active questions exist) and the replenishment case.
• Improve predictability and testability by splitting the operation into clearly defined phases.

---

## Proposed Changes

1. **Split the Function into Two Distinct Phases:**
   - **Evaluation Phase:**  
     - Filter current active (non-completed, non-dismissed) quests.
     - Call the OpenAI evaluation API to get evaluations for these active questions.
     - Update each quest’s status based on whether it is answered.
     - Save the updated quests (this “commit” can be used to test the evaluation separately).
   - **Generation Phase:**  
     - After evaluation, compute the number of remaining active questions.
     - If fewer than 5 remain, calculate the deficit.
     - Call the OpenAI generateQuestions API with the deficit count.
     - Generate new quest objects (with context hash and snapshot) for these questions.
     - Save a new combined list (previously updated quests + new quests).

2. **Refactoring into Helper Functions:**
   - Create an internal helper function `evaluateExistingQuests(fileContent: string, quests: Quest[], activeFilePath: string): Promise<Quest[]>`
     - This function handles filtering active quests, getting evaluations, and updating statuses.
   - Create another helper function `generateNewQuests(fileContent: string, activeFilePath: string, count: number): Promise<Quest[]>`
     - This function handles calling the generateQuestions API, constructing new Quest records (using `extractContext` and `generateContextHash`), and returns the new quests array.
   - In the main `refreshQuests` function, decide which phase(s) to invoke:
     - If there are no active quests at all, perform the generation phase immediately (to generate 5 initial questions).
     - Otherwise, first evaluate existing questions, then check the number of remaining active quests; if less than 5, call the generation helper with the needed count, and finally save the combined results.

3. **Testing Improvements:**
   - By isolating the evaluation and generation phases into separate functions, tests can be written:
     - To verify that given a set of active quests, the evaluation phase only updates the intended quest fields.
     - To verify that the generation phase produces the correct number of new quests.
   - The main function’s flow becomes a series of clear, sequential steps: load data → evaluate → (conditionally) generate → save. This reduces brittle dependencies (such as multiple calls to `saveQuests`) and makes it easier to mock and assert behavior.

---

## Key Code Changes (Pseudo Code)

### Proposed Helper Function Signatures

```ts
async function evaluateExistingQuests(
  plugin: ResearchQuest,
  fileContent: string,
  quests: Quest[],
  activeFilePath: string
): Promise<Quest[]> {
  const activeQuests = quests.filter(q => q.documentId === activeFilePath && !q.isCompleted && !q.isDismissed);
  if (activeQuests.length === 0) return quests;
  const evaluationResult = await plugin.openai.evaluateQuestions(
    fileContent,
    activeQuests.map(q => ({ id: q.id, question: q.question }))
  );
  return quests.map(q => {
    const evalResult = evaluationResult.evaluations.find(e => e.questionId === q.id);
    if (evalResult?.isAnswered) {
      return { ...q, isCompleted: true, completedAt: Date.now() };
    }
    return q;
  });
}

async function generateNewQuests(
  plugin: ResearchQuest,
  fileContent: string,
  activeFilePath: string,
  count: number
): Promise<Quest[]> {
  const newQuestions = await plugin.openai.generateQuestions(fileContent, count);
  return Promise.all(newQuestions.map(async question => {
    const contextSnapshot = extractContext(fileContent, question);
    return {
      id: crypto.randomUUID(),
      question,
      isCompleted: false,
      isDismissed: false,
      createdAt: Date.now(),
      documentId: activeFilePath,
      documentPath: activeFilePath,
      contextHash: await generateContextHash(fileContent),
      contextSnapshot,
      lastValidated: Date.now(),
    };
  }));
}
```

### Revised refreshQuests (Pseudo Code)

```ts
export default async function refreshQuests(plugin: ResearchQuest) {
  if (!plugin.openai) {
    console.error("OpenAI API key not configured");
    return;
  }
  const activeFile = plugin.app.workspace.getActiveFile();
  if (!activeFile) return;
  
  try {
    const fileContent = await plugin.app.vault.read(activeFile);
    const quests = await plugin.storage.getQuests();
    const activeFilePath = activeFile.path;
    const currentQuests = quests.filter(q => q.documentId === activeFilePath);
    const currentActiveQuests = currentQuests.filter(q => !q.isCompleted && !q.isDismissed);
    
    // If no active quests at all (i.e., first time), generate 5 new questions.
    if (currentActiveQuests.length === 0) {
      const newQuests = await generateNewQuests(plugin, fileContent, activeFilePath, 5);
      await plugin.storage.saveQuests([...quests, ...newQuests]);
      return;
    }
    
    // Phase 1: Evaluation.
    const evaluatedQuests = await evaluateExistingQuests(plugin, fileContent, quests, activeFilePath);
    await plugin.storage.saveQuests(evaluatedQuests);
    
    // Phase 2: Generation.
    const remainingActive = evaluatedQuests.filter(q =>
      q.documentId === activeFilePath && !q.isCompleted && !q.isDismissed
    );
    if (remainingActive.length < 5) {
      const countNeeded = 5 - remainingActive.length;
      const newQuests = await generateNewQuests(plugin, fileContent, activeFilePath, countNeeded);
      await plugin.storage.saveQuests([...evaluatedQuests, ...newQuests]);
    }
  } catch (error) {
    console.error("Error refreshing quests:", error);
  }
}
```

---

## Summary of Changes

- Split the logic into two phases (evaluation, then generation).
- Introduce helper functions (`evaluateExistingQuests` and `generateNewQuests`) to encapsulate discrete behaviors.
- Ensure that the evaluation phase runs first and saves its results before checking the count of active quests.
- Then, if the number of active quests (after evaluation) is less than 5, generate and save the additional questions.

This refactoring should create a clearer, more predictable flow that is easier to test and less dependent on inline state changes.

