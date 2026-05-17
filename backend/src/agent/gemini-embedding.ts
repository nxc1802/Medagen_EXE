import { Embeddings } from '@langchain/core/embeddings';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export class GeminiEmbedding extends Embeddings {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor() {
    super({});
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.modelName = config.gemini.embeddingModel;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      
      const embeddings = await Promise.all(
        texts.map(async (text) => {
          const result = await model.embedContent(text);
          return result.embedding.values;
        })
      );
      
      return embeddings;
    } catch (error) {
      logger.error({ error }, 'Error generating embeddings');
      throw new Error(`Embedding error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async embedQuery(text: string): Promise<number[]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      logger.error({ error }, 'Error generating query embedding');
      throw new Error(`Query embedding error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

