import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
// You can import more models like ChatOllama, etc. from @langchain/community if needed.

export type LLMProvider = 'google' | 'openai' | 'openrouter' | 'ollama' | 'alibaba';

export class LLMFactory {
  /**
   * Khởi tạo LLM Chat Model dựa trên provider được config
   * @param provider Tên provider (google, openai, openrouter,...)
   * @returns BaseChatModel instance
   */
  static createModel(provider: LLMProvider): BaseChatModel {
    switch (provider) {
      case 'google':
        return new ChatGoogleGenerativeAI({
          modelName: process.env.GOOGLE_MODEL_NAME || 'gemini-2.5-flash',
          apiKey: process.env.GOOGLE_API_KEY,
          maxRetries: 2,
        });

      case 'openai':
        return new ChatOpenAI({
          modelName: process.env.OPENAI_MODEL_NAME || 'gpt-4o',
          openAIApiKey: process.env.OPENAI_API_KEY,
          maxRetries: 2,
        });

      case 'openrouter':
        // OpenRouter uses the OpenAI compatible SDK with a custom base URL
        return new ChatOpenAI({
          modelName: process.env.OPENROUTER_MODEL_NAME || 'anthropic/claude-3-haiku',
          openAIApiKey: process.env.OPENROUTER_API_KEY,
          configuration: {
            baseURL: 'https://openrouter.ai/api/v1',
          },
          maxRetries: 2,
        });

      case 'alibaba':
        // Alibaba DashScope is OpenAI-compatible
        return new ChatOpenAI({
          modelName: process.env.ALIBABA_MODEL_NAME || 'qwen-max',
          openAIApiKey: process.env.ALIBABA_API_KEY,
          configuration: {
            baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          },
          maxRetries: 2,
        });

      case 'ollama':
        // Setup for local Ollama via OpenAI compatible endpoint
        return new ChatOpenAI({
          modelName: process.env.OLLAMA_MODEL_NAME || 'llama3',
          openAIApiKey: 'ollama', // dummy key required by OpenAI SDK
          configuration: {
            baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
          },
          maxRetries: 2,
        });

      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }
}
