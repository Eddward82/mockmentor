import { describe, it, expect, beforeEach } from 'vitest';
import { sessionRecovery, RecoverableSession } from '../../services/sessionRecovery';
import { InterviewMode, ExperienceLevel } from '../../types';

const mockSession: RecoverableSession = {
  config: {
    jobTitle: 'Frontend Developer',
    level: ExperienceLevel.MID,
    mode: InterviewMode.BEHAVIORAL,
    questionCount: 3
  },
  questions: [{ question: 'Tell me about yourself', tips: ['Be concise'], timeLimit: 90 }],
  currentQuestionIndex: 0,
  questionResponses: [],
  transcription: ['User: Hello'],
  sessionStartTime: Date.now(),
  savedAt: Date.now()
};

const STORAGE_KEY = 'mockmentor-session-recovery';

describe('sessionRecovery', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('should save and load a session', () => {
    sessionRecovery.save(mockSession);
    const loaded = sessionRecovery.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.config.jobTitle).toBe('Frontend Developer');
    expect(loaded!.questions).toHaveLength(1);
  });

  it('should return null when no session exists', () => {
    expect(sessionRecovery.load()).toBeNull();
  });

  it('should clear a session', () => {
    sessionRecovery.save(mockSession);
    expect(sessionRecovery.exists()).toBe(true);
    sessionRecovery.clear();
    expect(sessionRecovery.exists()).toBe(false);
    expect(sessionRecovery.load()).toBeNull();
  });

  it('should return true for exists when session is saved', () => {
    sessionRecovery.save(mockSession);
    expect(sessionRecovery.exists()).toBe(true);
  });

  it('should return false for exists when no session', () => {
    expect(sessionRecovery.exists()).toBe(false);
  });

  it('should discard sessions older than 1 hour', () => {
    const oldSession = { ...mockSession, savedAt: Date.now() - 61 * 60 * 1000 };
    sessionRecovery.save(oldSession);
    expect(sessionRecovery.load()).toBeNull();
  });

  it('should keep sessions within 1 hour', () => {
    const recentSession = { ...mockSession, savedAt: Date.now() - 30 * 60 * 1000 };
    sessionRecovery.save(recentSession);
    expect(sessionRecovery.load()).not.toBeNull();
  });

  it('should load from localStorage backup when sessionStorage is missing', () => {
    sessionRecovery.save(mockSession);
    sessionStorage.clear();

    const loaded = sessionRecovery.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.config.jobTitle).toBe(mockSession.config.jobTitle);
  });

  it('should reject corrupted wrapped payloads', () => {
    const wrapped = {
      version: 1,
      checksum: 1,
      payload: mockSession,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(wrapped));

    expect(sessionRecovery.load()).toBeNull();
  });
});
