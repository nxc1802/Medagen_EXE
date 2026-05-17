import { DynamicTool } from '@langchain/core/tools';
import { RAGService } from '../services/rag.service.js';
import { logger } from '../utils/logger.js';
import type { GuidelineQuery } from '../types/index.js';

export function createGuidelineRAGTool(ragService: RAGService): DynamicTool {
  return new DynamicTool({
    name: 'guideline_rag',
    description: 
      'Use this to retrieve medical guidelines and recommendations from Vietnamese Ministry of Health and WHO. ' +
      'Input must be a JSON string with symptoms (string), suspected_conditions (array), and triage_level (string). ' +
      'Returns relevant guideline snippets for safe, evidence-based recommendations.',
    func: async (queryJson: string) => {
      try {
        logger.info('Tool guideline_rag called');
        
        const query: GuidelineQuery = JSON.parse(queryJson);
        const guidelines = await ragService.searchGuidelines(query);
        
        if (guidelines.length === 0) {
          return JSON.stringify({
            message: 'No specific guidelines found',
            guidelines: []
          });
        }
        
        return JSON.stringify({
          message: `Found ${guidelines.length} relevant guidelines`,
          guidelines: guidelines
        });
      } catch (error) {
        logger.error({ error }, 'guideline_rag tool error');
        return JSON.stringify({ 
          error: 'Failed to retrieve guidelines',
          guidelines: []
        });
      }
    }
  });
}

