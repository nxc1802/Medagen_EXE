import axios from 'axios';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { CVResult } from '../types/index.js';

export class CVService {
  /**
   * Tích hợp với FastAPI thay vì Gradio.
   */
  private async callCVAPI(imageUrl: string, modelType: 'dermnet' | 'teeth' | 'nail', topK: number = 3): Promise<CVResult> {
    try {
      logger.info(`[MCP CV] Downloading image from ${imageUrl}...`);
      
      // 1. Download image as Buffer
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(imageResponse.data, 'binary');

      // 2. Prepare FormData to send to FastAPI
      const formData = new FormData();
      formData.append('file', new Blob([imageBuffer]), 'image.jpg');
      formData.append('model_name', modelType);
      formData.append('top_n', topK.toString());

      const endpoint = `${env.CV_ENDPOINT}/api/v1/predict`;
      logger.info(`[MCP CV] Calling FastAPI: ${endpoint} with model ${modelType}`);

      const headers: Record<string, string> = {
        'Content-Type': 'multipart/form-data'
      };

      if (env.CV_API_KEY) {
        headers['X-API-Key'] = env.CV_API_KEY;
      }

      const response = await axios.post(endpoint, formData, {
        headers,
        timeout: 30000
      });

      if (response.data && response.data.success) {
        const top_conditions = response.data.predictions.map((pred: any) => ({
          name: pred.class,
          prob: pred.confidence
        }));
        return { top_conditions };
      }
      return { top_conditions: [] };
    } catch (error: any) {
      logger.error(`[MCP CV] ERROR: ${error.message}`);
      return { top_conditions: [] };
    }
  }

  async callDermCV(imageUrl: string): Promise<CVResult> {
    return await this.callCVAPI(imageUrl, 'dermnet', 3);
  }

  async callTeethCV(imageUrl: string): Promise<CVResult> {
    return await this.callCVAPI(imageUrl, 'teeth', 3);
  }

  async callNailCV(imageUrl: string): Promise<CVResult> {
    return await this.callCVAPI(imageUrl, 'nail', 3);
  }

  async callEyeCV(imageUrl: string): Promise<CVResult> {
    logger.warn('[MCP CV] Eye CV requested, but no trained eye-specific model exists. Falling back to dermnet model as controlled fallback.');
    return await this.callCVAPI(imageUrl, 'dermnet', 3);
  }

  async callWoundCV(imageUrl: string): Promise<CVResult> {
    logger.warn('[MCP CV] Wound CV requested, but no trained wound-specific model exists. Falling back to dermnet model as controlled fallback.');
    return await this.callCVAPI(imageUrl, 'dermnet', 3);
  }

  async analyzeImage(imageUrl: string, type?: 'derm' | 'eye' | 'wound' | 'teeth' | 'nail'): Promise<CVResult> {
    if (type === 'derm') return this.callDermCV(imageUrl);
    if (type === 'teeth') return this.callTeethCV(imageUrl);
    if (type === 'nail') return this.callNailCV(imageUrl);
    if (type === 'eye') return this.callEyeCV(imageUrl);
    if (type === 'wound') return this.callWoundCV(imageUrl);
    return { top_conditions: [] };
  }
}
