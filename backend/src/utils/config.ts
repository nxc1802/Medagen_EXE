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
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-2.5-flash',
    embeddingModel: 'text-embedding-004'
  },
  
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
    anonKey: process.env.SUPABASE_ANON_KEY || ''
  },
  
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || ''
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
  const required = [
    { key: 'GEMINI_API_KEY', value: config.gemini.apiKey },
    { key: 'SUPABASE_URL', value: config.supabase.url },
    { key: 'SUPABASE_SERVICE_KEY', value: config.supabase.serviceKey }
  ];
  
  for (const { key, value } of required) {
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

