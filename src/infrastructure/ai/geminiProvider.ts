import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export type GeminiHealthStatus = {
  status: 'ok';
  latencyMs: number;
};

const getGeminiClient = (): GoogleGenerativeAI => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini health check failed: GEMINI_API_KEY is not set.');
  }

  return new GoogleGenerativeAI(apiKey);
};

export const checkGeminiHealth = async (
  model = DEFAULT_GEMINI_MODEL
): Promise<GeminiHealthStatus> => {
  const client = getGeminiClient();
  const modelClient = client.getGenerativeModel({ model });
  const startedAt = performance.now();

  try {
    const response = await modelClient.generateContent('Respond with OK');
    const latencyMs = Math.round(performance.now() - startedAt);
    const responseText = response.response.text();

    console.info('Gemini health check succeeded.', {
      model,
      response: responseText,
      latencyMs
    });

    return {
      status: 'ok',
      latencyMs
    };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startedAt);

    console.error('Gemini health check failed.', {
      model,
      latencyMs,
      error
    });

    throw new Error(
      `Gemini health check failed after ${latencyMs}ms: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};
