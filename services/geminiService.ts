import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { InterviewConfig, InterviewResult, InterviewQuestion } from '../types';
import { withRetry } from '../utils/retry';

export const generateQuestion = async (config: InterviewConfig): Promise<InterviewQuestion> => {
  try {
    // Always use process.env.API_KEY directly as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `You are a recruiter at ${config.company || 'a top-tier firm'}. 
    Generate a single ${config.level} interview question for a ${config.jobTitle} position.
    The interview mode is ${config.mode}.
    
    Provide:
    1. The question text.
    2. 3 short 'Pro Tips' for the candidate.
    3. A suggested time limit in seconds (typically 60-120).`;

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              tips: { type: Type.ARRAY, items: { type: Type.STRING } },
              timeLimit: { type: Type.NUMBER }
            },
            required: ['question', 'tips', 'timeLimit']
          }
        }
      })
    );

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error('Error generating question:', error);
    return {
      question: 'Could you describe your most significant professional achievement and the impact it had?',
      tips: ['Be specific', 'Quantify results', 'Focus on your role'],
      timeLimit: 90
    };
  }
};

export const generateQuestions = async (config: InterviewConfig, count: number = 3): Promise<InterviewQuestion[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `You are a recruiter at ${config.company || 'a top-tier firm'}.
    Generate ${count} distinct ${config.level} interview questions for a ${config.jobTitle} position.
    The interview mode is ${config.mode}.

    Make sure questions progressively increase in difficulty.
    Each question should cover a different aspect of the role.

    For each question provide:
    1. The question text.
    2. 3 short 'Pro Tips' for the candidate.
    3. A suggested time limit in seconds (typically 60-120).`;

    const response = await withRetry(
      () =>
        ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                questions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      tips: { type: Type.ARRAY, items: { type: Type.STRING } },
                      timeLimit: { type: Type.NUMBER }
                    },
                    required: ['question', 'tips', 'timeLimit']
                  }
                }
              },
              required: ['questions']
            }
          }
        }),
      { maxRetries: 1, baseDelay: 500, maxDelay: 2000 }
    );

    const result = JSON.parse(response.text || '{}');
    return result.questions || [];
  } catch (error) {
    console.error('Error generating questions:', error);
    // Return fallback questions
    const fallbackQuestions = [
      {
        question: 'Tell me about your background and what brings you to this role.',
        tips: ['Be concise', 'Highlight relevant experience', 'Show enthusiasm'],
        timeLimit: 90
      },
      {
        question: 'Describe a challenging project you worked on and how you overcame obstacles.',
        tips: ['Use the STAR method', 'Be specific about your contribution', 'Quantify results'],
        timeLimit: 120
      },
      {
        question: 'Where do you see yourself in five years and how does this role fit into that vision?',
        tips: ['Be realistic', 'Show ambition', 'Connect to company goals'],
        timeLimit: 90
      }
    ];
    return fallbackQuestions.slice(0, count);
  }
};

export const generateInterviewSummary = async (
  config: InterviewConfig,
  transcription: string
): Promise<Partial<InterviewResult>> => {
  try {
    // Always use process.env.API_KEY directly as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `Analyze this interview transcript for a ${config.level} ${config.jobTitle} position.
    Mode: ${config.mode}.
    Transcript: "${transcription}"

    Provide numeric scores (0-100) and specific actionable feedback. If the transcript is empty, provide baseline scores.`;

    const response = await withRetry(
      () =>
        ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                metrics: {
                  type: Type.OBJECT,
                  properties: {
                    communication: { type: Type.NUMBER },
                    confidence: { type: Type.NUMBER },
                    technicalAccuracy: { type: Type.NUMBER },
                    bodyLanguage: { type: Type.NUMBER },
                    overall: { type: Type.NUMBER }
                  },
                  required: ['communication', 'confidence', 'technicalAccuracy', 'bodyLanguage', 'overall']
                },
                suggestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ['metrics', 'suggestions']
            }
          }
        }),
      { maxRetries: 1, baseDelay: 500, maxDelay: 2000 }
    );

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error('Error generating summary:', error);
    return {
      metrics: { communication: 50, confidence: 50, technicalAccuracy: 50, bodyLanguage: 50, overall: 50 },
      suggestions: ['Try to provide more detail in your responses.', 'Focus on clear, concise communication.']
    };
  }
};

export const ANALYTICS_FUNCTION_DECLARATION: FunctionDeclaration = {
  name: 'updateAnalytics',
  parameters: {
    type: Type.OBJECT,
    description: 'Update real-time interview performance analytics based on visual and audio cues.',
    properties: {
      sentiment: {
        type: Type.STRING,
        description: 'The current emotional tone of the user (e.g., confident, nervous, thoughtful).'
      },
      bodyLanguageTip: {
        type: Type.STRING,
        description: 'Immediate feedback on posture, eye contact, or hand gestures.'
      },
      confidenceIndicator: {
        type: Type.NUMBER,
        description: 'Confidence score from 0 to 100 based on the last few minutes.'
      }
    },
    required: ['sentiment', 'bodyLanguageTip', 'confidenceIndicator']
  }
};
