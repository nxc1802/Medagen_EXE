import { DynamicTool } from '@langchain/core/tools';
import { CVService } from '../services/cv.service.js';
import { logger } from '../utils/logger.js';

export function createDermCVTool(cvService: CVService): DynamicTool {
  return new DynamicTool({
    name: 'derm_cv',
    description: 
      'Use this to analyze skin-related images (rash, spots, lesions, dermatological conditions). ' +
      'Input must be a public image URL string. Returns top predicted skin conditions with probabilities.',
    func: async (input: string) => {
      try {
        logger.info('Tool derm_cv called');
        
        // Clean input - extract URL and remove any LLM-generated text after it
        // Handle cases where LLM outputs "url\nObservation: ..." or similar
        const url = input.split('\n')[0].trim();
        
        logger.info(`Processing image URL: ${url}`);
        const result = await cvService.callDermCV(url);
        
        // Transform to agent-expected format
        const top_predictions = result.top_conditions.map(c => ({
          condition: c.name,
          probability: c.prob
        }));
        
        return JSON.stringify({ top_predictions });
      } catch (error) {
        logger.error({ error }, 'derm_cv tool error');
        return JSON.stringify({ error: 'Failed to analyze dermatology image', top_predictions: [] });
      }
    }
  });
}

export function createEyeCVTool(cvService: CVService): DynamicTool {
  return new DynamicTool({
    name: 'eye_cv',
    description: 
      'Use this to analyze eye-related images (red eye, conjunctivitis, eye conditions). ' +
      'Input must be a public image URL string. Returns top predicted eye conditions with probabilities.',
    func: async (input: string) => {
      try {
        logger.info('Tool eye_cv called');
        
        // Clean input - extract URL and remove any LLM-generated text after it
        const url = input.split('\n')[0].trim();
        
        logger.info(`Processing image URL: ${url}`);
        const result = await cvService.callEyeCV(url);
        
        // Transform to agent-expected format
        const top_predictions = result.top_conditions.map(c => ({
          condition: c.name,
          probability: c.prob
        }));
        
        return JSON.stringify({ top_predictions });
      } catch (error) {
        logger.error({ error }, 'eye_cv tool error');
        return JSON.stringify({ error: 'Failed to analyze eye image', top_predictions: [] });
      }
    }
  });
}

export function createWoundCVTool(cvService: CVService): DynamicTool {
  return new DynamicTool({
    name: 'wound_cv',
    description: 
      'Use this to analyze wound-related images (cuts, burns, injuries, wounds). ' +
      'Input must be a public image URL string. Returns wound assessment with severity and type.',
    func: async (input: string) => {
      try {
        logger.info('Tool wound_cv called');
        
        // Clean input - extract URL and remove any LLM-generated text after it
        const url = input.split('\n')[0].trim();
        
        logger.info(`Processing image URL: ${url}`);
        const result = await cvService.callWoundCV(url);
        
        // Transform to agent-expected format
        const top_predictions = result.top_conditions.map(c => ({
          condition: c.name,
          probability: c.prob
        }));
        
        return JSON.stringify({ top_predictions });
      } catch (error) {
        logger.error({ error }, 'wound_cv tool error');
        return JSON.stringify({ error: 'Failed to analyze wound image', top_predictions: [] });
      }
    }
  });
}

