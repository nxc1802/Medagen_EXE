import { LLM } from '@langchain/core/language_models/llms';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import type { LLMResult } from '@langchain/core/outputs';
import axios from 'axios';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000; // reduced from 15000 — less penalty on 429

// gemini-2.5-flash has thinking enabled by default; disabling it cuts latency significantly
const NO_THINKING: any = { thinkingConfig: { thinkingBudget: 0 } };

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const msg = String(err?.message ?? '');
      const isRetriable = status === 429 || status === 503
        || msg.includes('429') || msg.includes('503') || msg.includes('Service Unavailable');
      if (isRetriable && attempt < MAX_RETRIES) {
        let wait = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        try {
          const detail = err?.errorDetails ?? err?.body?.error?.details ?? [];
          const retryInfo = detail.find((d: any) => d['@type']?.includes('RetryInfo'));
          if (retryInfo?.retryDelay) {
            const secs = parseInt(retryInfo.retryDelay);
            if (!isNaN(secs)) wait = (secs + 1) * 1000;
          }
        } catch {}
        logger.warn(`[${label}] HTTP ${status ?? 'ERR'} — retrying in ${Math.round(wait / 1000)}s (attempt ${attempt}/${MAX_RETRIES})`);
        await new Promise(r => setTimeout(r, wait));
      } else {
        throw err;
      }
    }
  }
  throw new Error(`${label}: exceeded ${MAX_RETRIES} retries`);
}

export class GeminiLLM extends LLM {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor() {
    super({});
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.modelName = config.gemini.model;
  }

  _llmType(): string {
    return 'gemini';
  }

  private getModel() {
    return this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: NO_THINKING,
    });
  }

  async _call(
    prompt: string,
    _options?: this['ParsedCallOptions'],
    _runManager?: CallbackManagerForLLMRun
  ): Promise<string> {
    const result = await this._generate([prompt], _options, _runManager);
    return result.generations[0][0].text;
  }

  async _generate(
    prompts: string[],
    _options?: this['ParsedCallOptions'],
    _runManager?: CallbackManagerForLLMRun
  ): Promise<LLMResult> {
    const model = this.getModel();
    logger.info(`Calling Gemini ${this.modelName}...`);

    const generations = await Promise.all(
      prompts.map(prompt =>
        withRetry(async () => {
          const result = await model.generateContent(prompt);
          const text = result.response.text();
          return { text, generationInfo: {} };
        }, 'GeminiLLM._generate')
      )
    );

    logger.info('Gemini response received');
    return { generations: [generations] };
  }

  // Stream tokens for SSE responses — yields text chunks as they arrive
  async *generateStream(prompt: string): AsyncGenerator<string> {
    const model = this.getModel();
    logger.info(`[Gemini Stream] Starting stream for ${this.modelName}...`);

    const response = await withRetry(
      () => model.generateContentStream(prompt),
      'GeminiLLM.generateStream'
    );

    for await (const chunk of response.stream) {
      const text = chunk.text();
      if (text) yield text;
    }

    logger.info('[Gemini Stream] Stream complete');
  }

  // Analyze image + prompt directly via Gemini Vision
  async generateWithImage(imageUrl: string, prompt: string): Promise<string> {
    logger.info(`[Gemini Vision] Analyzing image: ${imageUrl}`);
    const model = this.getModel();

    const imageResp = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
    const base64 = Buffer.from(imageResp.data).toString('base64');
    const contentType = (imageResp.headers['content-type'] as string) || 'image/jpeg';

    return withRetry(async () => {
      const result = await model.generateContent([
        { inlineData: { data: base64, mimeType: contentType } },
        prompt,
      ]);
      const text = result.response.text();
      logger.info('[Gemini Vision] Analysis complete');
      return text;
    }, 'GeminiLLM.generateWithImage');
  }
}
