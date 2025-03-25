import { describe, it, expect, vi, beforeEach } from "vitest";
import { StorageService } from "./index";

describe("StorageService", () => {
  const mockPlugin: any = {
    loadData: vi.fn(),
    saveData: vi.fn(),
  };

  let storage: StorageService;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new StorageService(mockPlugin);
  });

  describe("getQuests", () => {
    it("should return empty array when no data exists", async () => {
      mockPlugin.loadData.mockResolvedValue(null);
      const quests = await storage.getQuests();
      expect(quests).toEqual([]);
    });

    it("should return quests from plugin data", async () => {
      const mockQuests = [
        {
          id: "1",
          question: "Test question",
          isCompleted: false,
          isDismissed: false,
          createdAt: Date.now(),
          documentId: "test.md",
          documentPath: "test.md",
        },
      ];
      mockPlugin.loadData.mockResolvedValue({ quests: mockQuests });
      const quests = await storage.getQuests();
      expect(quests).toEqual(mockQuests);
    });
  });

  describe("getQuestsForDocument", () => {
    it("should return only quests for specified document", async () => {
      const mockQuests = [
        {
          id: "1",
          question: "Doc 1 question",
          documentId: "doc1.md",
          documentPath: "doc1.md",
          isCompleted: false,
          isDismissed: false,
          createdAt: Date.now(),
        },
        {
          id: "2",
          question: "Doc 2 question",
          documentId: "doc2.md",
          documentPath: "doc2.md",
          isCompleted: false,
          isDismissed: false,
          createdAt: Date.now(),
        },
      ];
      mockPlugin.loadData.mockResolvedValue({ quests: mockQuests });

      const doc1Quests = await storage.getQuestsForDocument("doc1.md");
      expect(doc1Quests).toHaveLength(1);
      expect(doc1Quests[0].documentId).toBe("doc1.md");
    });

    it("should return empty array when no quests exist for document", async () => {
      const mockQuests = [
        {
          id: "1",
          question: "Doc 1 question",
          documentId: "doc1.md",
          documentPath: "doc1.md",
          isCompleted: false,
          isDismissed: false,
          createdAt: Date.now(),
        },
      ];
      mockPlugin.loadData.mockResolvedValue({ quests: mockQuests });

      const doc2Quests = await storage.getQuestsForDocument("doc2.md");
      expect(doc2Quests).toEqual([]);
    });
  });

  describe("saveQuests", () => {
    it("should save quests to plugin data", async () => {
      const questsToSave = [
        {
          id: "1",
          question: "Test question",
          isCompleted: false,
          isDismissed: false,
          createdAt: Date.now(),
          documentId: "test.md",
          documentPath: "test.md",
        },
      ];

      await storage.saveQuests(questsToSave);

      expect(mockPlugin.saveData).toHaveBeenCalledWith({
        quests: questsToSave,
      });
    });

    it("should preserve existing data when saving quests", async () => {
      const existingData = {
        someOtherKey: "value",
        quests: [],
      };
      mockPlugin.loadData.mockResolvedValue(existingData);

      const questsToSave = [
        {
          id: "1",
          question: "Test question",
          isCompleted: false,
          isDismissed: false,
          createdAt: Date.now(),
          documentId: "test.md",
          documentPath: "test.md",
        },
      ];

      await storage.saveQuests(questsToSave);

      expect(mockPlugin.saveData).toHaveBeenCalledWith({
        someOtherKey: "value",
        quests: questsToSave,
      });
    });
  });
});
