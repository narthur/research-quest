import { describe, it, expect, vi, beforeEach } from 'vitest';
import generateNewQuests from '../generateNewQuests';
import type { Quest } from '../services/storage';

describe('generateNewQuests', () => {
  const mockPlugin = {
    openai: {
      generateQuestions: vi.fn(),
      evaluateQuestions: vi.fn(),
    },
    storage: {
      getQuests: vi.fn(),
      saveQuests: vi.fn(),
    },
    app: {
      workspace: {
        getActiveFile: vi.fn(),
      },
      vault: {
        read: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPlugin.app.workspace.getActiveFile.mockReturnValue({ path: 'test.md' });
    mockPlugin.app.vault.read.mockResolvedValue('Test content');
    mockPlugin.storage.getQuests.mockResolvedValue([]);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should not generate questions if OpenAI is not configured', async () => {
    const pluginWithoutOpenAI = { ...mockPlugin, openai: undefined };
    await generateNewQuests(pluginWithoutOpenAI);
    expect(mockPlugin.storage.saveQuests).not.toHaveBeenCalled();
  });

  it('should not generate questions if no active file', async () => {
    mockPlugin.app.workspace.getActiveFile.mockReturnValue(null);
    await generateNewQuests(mockPlugin);
    expect(mockPlugin.storage.saveQuests).not.toHaveBeenCalled();
  });

  it('should generate new questions when less than 5 active questions', async () => {
    const newQuestions = ['Question 1', 'Question 2'];
    mockPlugin.openai.generateQuestions.mockResolvedValue(newQuestions);
    
    await generateNewQuests(mockPlugin);

    expect(mockPlugin.openai.generateQuestions).toHaveBeenCalledWith('Test content', 5);
    expect(mockPlugin.storage.saveQuests).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          question: 'Question 1',
          isCompleted: false,
          documentId: 'test.md',
        }),
        expect.objectContaining({
          question: 'Question 2',
          isCompleted: false,
          documentId: 'test.md',
        }),
      ])
    );
  });

  it('should evaluate existing questions for completion', async () => {
    const existingQuests: Quest[] = [
      {
        id: '1',
        question: 'Existing question',
        isCompleted: false,
        createdAt: Date.now(),
        documentId: 'test.md',
        documentPath: 'test.md',
      },
    ];

    mockPlugin.storage.getQuests.mockResolvedValue(existingQuests);
    mockPlugin.openai.evaluateQuestions.mockResolvedValue({
      evaluations: [
        {
          questionId: '1',
          isAnswered: true,
          explanation: 'Found answer in text',
        },
      ],
    });

    await generateNewQuests(mockPlugin);

    expect(mockPlugin.openai.evaluateQuestions).toHaveBeenCalledWith(
      'Test content',
      expect.arrayContaining([
        expect.objectContaining({
          id: '1',
          question: 'Existing question',
        }),
      ])
    );

    expect(mockPlugin.storage.saveQuests).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: '1',
          isCompleted: true,
          completedAt: expect.any(Number),
        }),
      ])
    );
  });

  it('should handle API errors gracefully', async () => {
    mockPlugin.openai.generateQuestions.mockRejectedValue(new Error('API Error'));
    
    await expect(generateNewQuests(mockPlugin)).resolves.not.toThrow();
    expect(console.error).toHaveBeenCalledWith(
      'Error refreshing quests:',
      expect.any(Error)
    );
  });
});
