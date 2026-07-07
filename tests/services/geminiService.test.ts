import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InterviewMode, ExperienceLevel } from '../../types';

// geminiService delegates to the backend API layer — mock it.
vi.mock('../../services/aiApi', () => ({
  generateQuestions: vi.fn(),
  analyzeInterview: vi.fn(),
}));

import { generateQuestions as apiGenerateQuestions, analyzeInterview as apiAnalyzeInterview } from '../../services/aiApi';
import { generateQuestion, generateQuestions, generateInterviewSummary } from '../../services/geminiService';

describe('geminiService', () => {
  const mockConfig = {
    jobTitle: 'Software Engineer',
    level: ExperienceLevel.MID,
    mode: InterviewMode.BEHAVIORAL,
    company: 'TestCorp',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateQuestion', () => {
    it('returns the first question from the API', async () => {
      vi.mocked(apiGenerateQuestions).mockResolvedValue([
        { question: 'Tell me about a challenging project.', tips: ['Be specific', 'Quantify results', 'Show impact'], timeLimit: 90 },
      ]);

      const result = await generateQuestion(mockConfig);

      expect(apiGenerateQuestions).toHaveBeenCalledWith(mockConfig, 1);
      expect(result.question).toBe('Tell me about a challenging project.');
      expect(Array.isArray(result.tips)).toBe(true);
      expect(typeof result.timeLimit).toBe('number');
    });

    it('falls back to a default question when the API returns none', async () => {
      vi.mocked(apiGenerateQuestions).mockResolvedValue([]);

      const result = await generateQuestion(mockConfig);

      expect(result).toHaveProperty('question');
      expect(result.tips).toHaveLength(3);
      expect(typeof result.timeLimit).toBe('number');
    });
  });

  describe('generateQuestions', () => {
    it('delegates to the API with the requested count', async () => {
      const questions = [
        { question: 'Q1', tips: ['a', 'b', 'c'], timeLimit: 60 },
        { question: 'Q2', tips: ['a', 'b', 'c'], timeLimit: 90 },
      ];
      vi.mocked(apiGenerateQuestions).mockResolvedValue(questions);

      const result = await generateQuestions(mockConfig, 2);

      expect(apiGenerateQuestions).toHaveBeenCalledWith(mockConfig, 2);
      expect(result).toEqual(questions);
    });
  });

  describe('generateInterviewSummary', () => {
    it('returns metrics and suggestions from the API', async () => {
      vi.mocked(apiAnalyzeInterview).mockResolvedValue({
        metrics: {
          communication: 80,
          confidence: 75,
          technicalAccuracy: 85,
          bodyLanguage: 70,
          answerStructure: 72,
          clarity: 77,
          overall: 78,
        },
        strengths: ['Clear examples'],
        improvementAreas: ['Pacing'],
        suggestions: ['Practice more', 'Be concise'],
      });

      const result = await generateInterviewSummary(mockConfig, 'Test transcript');

      expect(apiAnalyzeInterview).toHaveBeenCalledWith(mockConfig, 'Test transcript');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('suggestions');
    });
  });
});
