import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMFactory } from '../../src/providers/llm.factory';
import { EmbeddingFactory } from '../../src/providers/embedding.factory';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

describe('LLMFactory', () => {
  beforeEach(() => {
    process.env.GOOGLE_API_KEY = 'dummy-google-key';
  });
  it('should instantiate Google LLM by default', () => {
    const llm = LLMFactory.createModel('google');
    expect(llm).toBeInstanceOf(ChatGoogleGenerativeAI);
  });

  it('should throw on unsupported provider', () => {
    expect(() => LLMFactory.createModel('unsupported' as any)).toThrow('Unsupported LLM provider: unsupported');
  });
});

describe('EmbeddingFactory', () => {
  beforeEach(() => {
    process.env.GOOGLE_API_KEY = 'dummy-google-key';
  });
  it('should instantiate Google Embedding by default', () => {
    const embed = EmbeddingFactory.createEmbedding('google');
    expect(embed).toBeInstanceOf(GoogleGenerativeAIEmbeddings);
  });

  it('should throw on unsupported provider', () => {
    expect(() => EmbeddingFactory.createEmbedding('unsupported' as any)).toThrow('Unsupported Embedding provider: unsupported');
  });
});
