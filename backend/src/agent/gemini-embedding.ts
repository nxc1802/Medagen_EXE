import { Embeddings } from '@langchain/core/embeddings';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

async function retryEmbed<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [15000, 30000, 60000];
  for (let i = 0; i <= delays.length; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const retriable = status === 429 || status === 503 || status === 404;
      if (retriable && i < delays.length) {
        logger.warn(`[GeminiEmbedding] HTTP ${status} — retrying in ${delays[i] / 1000}s (attempt ${i + 1})`);
        await new Promise(r => setTimeout(r, delays[i]));
      } else {
        throw err;
      }
    }
  }
  throw new Error('GeminiEmbedding: max retries exceeded');
}

export class GeminiEmbedding extends Embeddings {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor() {
    super({});
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.modelName = config.gemini.embeddingModel;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    return Promise.all(
      texts.map(text =>
        retryEmbed(async () => {
          const result = await model.embedContent(text);
          return result.embedding.values;
        })
      )
    );
  }

  async embedQuery(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    return retryEmbed(async () => {
      const result = await model.embedContent(text);
      return result.embedding.values;
    });
  }
}

