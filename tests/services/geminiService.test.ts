import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InterviewMode, ExperienceLevel } from '../../types';

// Mock the Google GenAI SDK
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn().mockResolvedValue({
        text: JSON.stringify({
          question: 'Tell me about a challenging project.',
          tips: ['Be specific', 'Quantify results', 'Show impact'],
          timeLimit: 90
        })
      })
    }
  })),
  Type: {
    OBJECT: 'object',
    STRING: 'string',
    ARRAY: 'array',
    NUMBER: 'number'
  }
}));

describe('geminiService', () => {
  const mockConfig = {
    jobTitle: 'Software Engineer',
    level: ExperienceLevel.MID,
    mode: InterviewMode.BEHAVIORAL,
    company: 'TestCorp'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateQuestion', () => {
    it('should return a valid InterviewQuestion', async () => {
      const { generateQuestion } = await import('../../services/geminiService');
      const result = await generateQuestion(mockConfig);

      expect(result).toHaveProperty('question');
      expect(result).toHaveProperty('tips');
      expect(result).toHaveProperty('timeLimit');
      expect(Array.isArray(result.tips)).toBe(true);
      expect(typeof result.timeLimit).toBe('number');
    });
  });

  describe('generateInterviewSummary', () => {
    it('should return metrics and suggestions', async () => {
      const { GoogleGenAI } = await import('@google/genai');
      vi.mocked(GoogleGenAI).mockImplementation(
        () =>
          ({
            models: {
              generateContent: vi.fn().mockResolvedValue({
                text: JSON.stringify({
                  metrics: {
                    communication: 80,
                    confidence: 75,
                    technicalAccuracy: 85,
                    bodyLanguage: 70,
                    overall: 78
                  },
                  suggestions: ['Practice more', 'Be concise']
                })
              })
            }
          }) as ReturnType<typeof GoogleGenAI>
      );

      const { generateInterviewSummary } = await import('../../services/geminiService');
      const result = await generateInterviewSummary(mockConfig, 'Test transcript');

      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('suggestions');
    });
  });

  describe('ANALYTICS_FUNCTION_DECLARATION', () => {
    it('should export a valid function declaration', async () => {
      const { ANALYTICS_FUNCTION_DECLARATION } = await import('../../services/geminiService');

      expect(ANALYTICS_FUNCTION_DECLARATION).toHaveProperty('name');
      expect(ANALYTICS_FUNCTION_DECLARATION.name).toBe('updateAnalytics');
      expect(ANALYTICS_FUNCTION_DECLARATION).toHaveProperty('parameters');
    });
  });
});
