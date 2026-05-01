/**
 * geminiService.ts — Thin wrappers that delegate to the secure backend API.
 *
 * All AI calls (Gemini + OpenAI) now go through Firebase Cloud Functions.
 * No API keys are used here.
 */

import { InterviewConfig, InterviewResult, InterviewQuestion } from '../types';
import { generateQuestions as apiGenerateQuestions, analyzeInterview as apiAnalyzeInterview } from './aiApi';

export const generateQuestion = async (config: InterviewConfig): Promise<InterviewQuestion> => {
  const questions = await apiGenerateQuestions(config, 1);
  return (
    questions[0] ?? {
      question: 'Could you describe your most significant professional achievement and the impact it had?',
      tips: ['Be specific', 'Quantify results', 'Focus on your role'],
      timeLimit: 90,
    }
  );
};

export const generateQuestions = async (
  config: InterviewConfig,
  count: number = 3
): Promise<InterviewQuestion[]> => {
  return apiGenerateQuestions(config, count);
};

export const generateInterviewSummary = async (
  config: InterviewConfig,
  transcription: string
): Promise<Partial<InterviewResult>> => {
  return apiAnalyzeInterview(config, transcription);
};
