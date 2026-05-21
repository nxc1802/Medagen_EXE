import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from project root
dotenv.config({ path: join(__dirname, '../../.env') });

// Parse PORT, handle string values with quotes or spaces
const portEnv = process.env.PORT?.trim().replace(/['"]/g, '') || '3000';
const port = parseInt(portEnv, 10);

if (isNaN(port)) {
  console.warn(`Invalid PORT value: ${process.env.PORT}, using default 3000`);
}

export const config = {
  port: isNaN(port) ? 3000 : port,
  
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
    model: process.env.GOOGLE_MODEL_NAME || 'gemini-2.5-flash',
    embeddingModel: process.env.GOOGLE_EMBEDDING_MODEL_NAME || 'text-embedding-004'
  },
  
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
    anonKey: process.env.SUPABASE_ANON_KEY || ''
  },
  
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
    enabled: !!process.env.GOOGLE_MAPS_API_KEY
  },
  
  cvModels: {
    endpoint: process.env.CV_ENDPOINT || '',
    // Legacy support
    dermCV: process.env.DERM_CV_API_URL || '',
    eyeCV: process.env.EYE_CV_API_URL || '',
    woundCV: process.env.WOUND_CV_API_URL || ''
  },
  
  agent: {
    maxIterations: 5,
    verbose: true
  },
  
  rateLimit: {
    max: 5,
    timeWindow: '1 minute'
  }
};

// Validate required config
export function validateConfig() {
  // Supabase is always required
  const required = [
    { key: 'SUPABASE_URL', value: config.supabase.url },
    { key: 'SUPABASE_SERVICE_KEY', value: config.supabase.serviceKey }
  ];
  
  for (const { key, value } of required) {
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  // Google provider validation
  const llmProvider = process.env.LLM_PROVIDER || 'google';
  const embedProvider = process.env.EMBEDDING_PROVIDER || 'google';

  if (llmProvider === 'google' || embedProvider === 'google') {
    const googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!googleKey) {
      throw new Error('Missing required environment variable: GOOGLE_API_KEY or GEMINI_API_KEY (required since Google provider is active)');
    }
  }

  // OpenAI provider validation
  if (llmProvider === 'openai' || embedProvider === 'openai') {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Missing required environment variable: OPENAI_API_KEY (required since OpenAI provider is active)');
    }
  }

  // OpenRouter provider validation
  if (llmProvider === 'openrouter' || embedProvider === 'openrouter') {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('Missing required environment variable: OPENROUTER_API_KEY (required since OpenRouter provider is active)');
    }
  }
}

