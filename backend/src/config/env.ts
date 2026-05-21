import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  HOST: z.string().default('0.0.0.0'),
  
  // LLM Configurations
  LLM_PROVIDER: z.enum(['google', 'openai', 'openrouter', 'ollama', 'alibaba']).default('google'),
  GOOGLE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  ALIBABA_API_KEY: z.string().optional(),
  
  // Embedding Configurations
  EMBEDDING_PROVIDER: z.enum(['google', 'openai', 'ollama', 'openrouter']).default('google'),
  
  // Services
  CV_ENDPOINT: z.string().url().default('http://localhost:8000'),
  CV_API_KEY: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
});

const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:', error.format());
    }
    process.exit(1);
  }
};

export const env = parseEnv();
