import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InterviewMode, ExperienceLevel, InterviewResult } from '../../types';

// Mock Firebase modules
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  query: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: { now: vi.fn() }
}));

vi.mock('../../services/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-123' } }
}));

describe('persistenceService', () => {
  const mockResult: InterviewResult = {
    id: 'test-id',
    date: new Date().toISOString(),
    config: {
      jobTitle: 'Software Engineer',
      level: ExperienceLevel.MID,
      mode: InterviewMode.BEHAVIORAL
    },
    metrics: {
      communication: 80,
      confidence: 75,
      technicalAccuracy: 85,
      bodyLanguage: 70,
      answerStructure: 70,
      clarity: 70,
      overall: 78
    },
    suggestions: ['Practice more'],
    transcription: 'Test transcript',
    duration: 300
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('localStorage fallback', () => {
    it('should handle saveInterview call without throwing', async () => {
      const { compositionRoot } = await import('../../infrastructure/composition/root');
      const persistenceService = compositionRoot.interviewHistoryRepository;

      // Save might go to Firestore or localStorage depending on mock
      // Just verify it doesn't throw
      await expect(persistenceService.saveInterview(mockResult)).resolves.not.toThrow();
    });

    it('should handle clearHistory without throwing when signed out', async () => {
      // History is Firestore-backed; with no signed-in user this is a no-op.
      const { compositionRoot } = await import('../../infrastructure/composition/root');
      const persistenceService = compositionRoot.interviewHistoryRepository;
      await expect(persistenceService.clearHistory()).resolves.not.toThrow();
    });
  });

  describe('getHistory', () => {
    it('should return array', async () => {
      const { compositionRoot } = await import('../../infrastructure/composition/root');
      const persistenceService = compositionRoot.interviewHistoryRepository;
      const result = await persistenceService.getHistory('test-uid');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getMonthlyInterviewCount', () => {
    it('should return a number', async () => {
      const { compositionRoot } = await import('../../infrastructure/composition/root');
      const persistenceService = compositionRoot.interviewHistoryRepository;
      const count = await persistenceService.getMonthlyInterviewCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
