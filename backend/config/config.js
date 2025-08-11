import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables from project root .env
dotenv.config({ path: path.join(process.cwd(), '.env') });

export function getConfig() {
  const nodeEnv = process.env.NODE_ENV || 'development';

  return {
    nodeEnv,
    port: parseInt(process.env.PORT || '3001', 10),
    ai: {
      provider: (process.env.AI_MODEL_PROVIDER || 'google').toLowerCase(),
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      geminiApiKey: process.env.GEMINI_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
    },
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      file: process.env.LOG_FILE || '',
    },
    browser: {
      headless: process.env.BROWSER_HEADLESS === 'true',
      timeout: parseInt(process.env.BROWSER_TIMEOUT || '30000', 10),
      viewport: {
        width: parseInt(process.env.BROWSER_VIEWPORT_WIDTH || '1280', 10),
        height: parseInt(process.env.BROWSER_VIEWPORT_HEIGHT || '720', 10),
      },
    },
  };
}

export function validateConfig(config) {
  const missing = [];

  // Validate AI provider requirements
  if (config.ai.provider === 'google' || config.ai.provider === 'gemini') {
    if (!config.ai.geminiApiKey) missing.push('GEMINI_API_KEY');
  }
  if (config.ai.provider === 'openai') {
    if (!config.ai.openaiApiKey) missing.push('OPENAI_API_KEY');
  }

  if (missing.length > 0) {
    const error = `Missing required environment variables: ${missing.join(', ')}`;
    throw new Error(error);
  }
}