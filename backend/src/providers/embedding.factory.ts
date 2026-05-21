import { Embeddings, type EmbeddingsParams } from '@langchain/core/embeddings';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { OpenAIEmbeddings } from '@langchain/openai';
import axios from 'axios';
import { logger } from '../utils/logger.js';

export type EmbeddingProvider = 'google' | 'openai' | 'ollama' | 'openrouter';

export class OpenRouterEmbeddings extends Embeddings {
  private apiKey: string;
  private modelName: string;

  constructor(fields: { apiKey: string; modelName?: string } & EmbeddingsParams) {
    super(fields);
    this.apiKey = fields.apiKey;
    this.modelName = fields.modelName || 'nvidia/llama-nemotron-embed-vl-1b-v2:free';
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/embeddings',
        {
          model: this.modelName,
          input: texts,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.data?.error) {
        throw new Error(response.data.error.message || 'Unknown OpenRouter error');
      }
      
      const data = response.data?.data;
      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid response format from OpenRouter embeddings API');
      }
      
      const sortedData = [...data].sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0));
      return sortedData.map((item: any) => item.embedding);
    } catch (error: any) {
      throw new Error(`OpenRouter embeddings error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async embedQuery(text: string): Promise<number[]> {
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/embeddings',
        {
          model: this.modelName,
          input: text,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.data?.error) {
        throw new Error(response.data.error.message || 'Unknown OpenRouter error');
      }
      
      const data = response.data?.data;
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid response format from OpenRouter embeddings API');
      }
      
      return data[0].embedding;
    } catch (error: any) {
      throw new Error(`OpenRouter query embedding error: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

export class EmbeddingFactory {
  /**
   * Khởi tạo Embedding Model dựa trên provider được config
   * @param provider Tên provider (google, openai, ollama, openrouter)
   * @returns Embeddings instance
   */
  static createEmbedding(provider: EmbeddingProvider): Embeddings {
    switch (provider) {
      case 'google': {
        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        const modelName = process.env.GOOGLE_EMBEDDING_MODEL_NAME || 'text-embedding-004';
        
        logger.info(`[EMBEDDING] Initializing GoogleGenerativeAIEmbeddings with model: ${modelName}`);
        
        if (!apiKey) {
          logger.warn('[EMBEDDING] GOOGLE_API_KEY is not defined. GoogleGenerativeAIEmbeddings might fail.');
        }

        return new GoogleGenerativeAIEmbeddings({
          apiKey,
          modelName,
        });
      }

      case 'openai': {
        const apiKey = process.env.OPENAI_API_KEY;
        const modelName = process.env.OPENAI_EMBEDDING_MODEL_NAME || 'text-embedding-3-small';
        
        logger.info(`[EMBEDDING] Initializing OpenAIEmbeddings with model: ${modelName}`);
        
        if (!apiKey) {
          logger.warn('[EMBEDDING] OPENAI_API_KEY is not defined. OpenAIEmbeddings might fail.');
        }

        return new OpenAIEmbeddings({
          openAIApiKey: apiKey,
          modelName,
        });
      }

      case 'openrouter': {
        const apiKey = process.env.OPENROUTER_API_KEY;
        const modelName = process.env.OPENROUTER_EMBEDDING_MODEL_NAME || 'nvidia/llama-nemotron-embed-vl-1b-v2:free';
        
        logger.info(`[EMBEDDING] Initializing OpenRouter custom Embeddings with model: ${modelName}`);
        
        if (!apiKey) {
          logger.warn('[EMBEDDING] OPENROUTER_API_KEY is not defined. OpenRouter embeddings might fail.');
        }

        return new OpenRouterEmbeddings({
          apiKey: apiKey || '',
          modelName,
        });
      }

      case 'ollama': {
        const modelName = process.env.OLLAMA_EMBEDDING_MODEL_NAME || 'nomic-embed-text';
        const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
        
        logger.info(`[EMBEDDING] Initializing Ollama-compatible OpenAIEmbeddings with model: ${modelName} at ${baseURL}`);
        
        return new OpenAIEmbeddings({
          openAIApiKey: 'ollama', // dummy key required by OpenAI SDK
          modelName,
          configuration: {
            baseURL,
          }
        });
      }

      default:
        throw new Error(`Unsupported Embedding provider: ${provider}`);
    }
  }
}
