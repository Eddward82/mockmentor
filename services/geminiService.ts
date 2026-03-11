import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { InterviewConfig, InterviewResult, InterviewQuestion } from '../types';
import { withRetry } from '../utils/retry';

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const getGeminiModel = (): string => process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

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
        model: getGeminiModel(),
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
          model: getGeminiModel(),
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
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `You are a professional interview coach. Evaluate this ${config.level} ${config.jobTitle} interview (${config.mode} mode).

Transcript:
"${transcription}"

Score the candidate 0-100 in each category. If the transcript is empty or very short, provide fair baseline scores around 50.

Categories:
- communication: clarity of speech, vocabulary, articulation
- confidence: tone, assertiveness, self-assurance
- technicalAccuracy: correctness of domain knowledge and facts
- bodyLanguage: posture, eye contact, gestures (infer from context if video not available)
- answerStructure: use of frameworks (STAR, etc.), logical flow, completeness
- clarity: conciseness, avoiding rambling, getting to the point
- overall: weighted average across all categories

Also provide:
- strengths: exactly 3 specific things the candidate did well
- improvementAreas: exactly 3 specific areas that need work
- suggestions: exactly 3 actionable recommendations the candidate can practice before their next interview`;

    const response = await withRetry(
      () =>
        ai.models.generateContent({
          model: getGeminiModel(),
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                metrics: {
                  type: Type.OBJECT,
                  properties: {
                    communication:    { type: Type.NUMBER },
                    confidence:       { type: Type.NUMBER },
                    technicalAccuracy:{ type: Type.NUMBER },
                    bodyLanguage:     { type: Type.NUMBER },
                    answerStructure:  { type: Type.NUMBER },
                    clarity:          { type: Type.NUMBER },
                    overall:          { type: Type.NUMBER }
                  },
                  required: ['communication', 'confidence', 'technicalAccuracy', 'bodyLanguage', 'answerStructure', 'clarity', 'overall']
                },
                strengths:        { type: Type.ARRAY, items: { type: Type.STRING } },
                improvementAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestions:      { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['metrics', 'strengths', 'improvementAreas', 'suggestions']
            }
          }
        }),
      { maxRetries: 1, baseDelay: 500, maxDelay: 2000 }
    );

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error('Error generating summary:', error);
    return {
      metrics: { communication: 50, confidence: 50, technicalAccuracy: 50, bodyLanguage: 50, answerStructure: 50, clarity: 50, overall: 50 },
      strengths: ['You completed the interview session.', 'You engaged with the question prompts.', 'You showed up and practiced.'],
      improvementAreas: ['Provide more specific examples in your answers.', 'Work on structuring answers with a clear beginning, middle, and end.', 'Practice speaking with greater confidence and pace.'],
      suggestions: ['Try to provide more detail in your responses.', 'Focus on clear, concise communication.', 'Use the STAR method to structure behavioral answers.']
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
