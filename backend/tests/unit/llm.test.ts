import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMFactory } from '../../src/providers/llm.factory';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

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
