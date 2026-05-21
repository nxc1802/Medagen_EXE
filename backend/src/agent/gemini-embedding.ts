import { Embeddings } from '@langchain/core/embeddings';
import { EmbeddingFactory, type EmbeddingProvider } from '../providers/embedding.factory.js';
import { logger } from '../utils/logger.js';

export class GeminiEmbedding extends Embeddings {
  private delegate: Embeddings;

  constructor() {
    super({});
    const provider = (process.env.EMBEDDING_PROVIDER || 'google') as EmbeddingProvider;
    this.delegate = EmbeddingFactory.createEmbedding(provider);
  }

  private sliceAndNormalize(vector: number[], targetDim = 1024): number[] {
    if (vector.length <= targetDim) {
      return vector;
    }
    
    // Slice to targetDim (1024)
    const sliced = vector.slice(0, targetDim);
    
    // Calculate L2 norm
    let sumSq = 0;
    for (let i = 0; i < targetDim; i++) {
      sumSq += sliced[i] * sliced[i];
    }
    const norm = Math.sqrt(sumSq);
    
    if (norm === 0) {
      return sliced;
    }
    
    // Normalize
    for (let i = 0; i < targetDim; i++) {
      sliced[i] /= norm;
    }
    
    return sliced;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    try {
      const embeddings = await this.delegate.embedDocuments(texts);
      return embeddings.map(emb => this.sliceAndNormalize(emb));
    } catch (error) {
      logger.error({ error }, 'Error generating embeddings');
      throw new Error(`Embedding error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async embedQuery(text: string): Promise<number[]> {
    try {
      const embedding = await this.delegate.embedQuery(text);
      return this.sliceAndNormalize(embedding);
    } catch (error) {
      logger.error({ error }, 'Error generating query embedding');
      throw new Error(`Query embedding error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
