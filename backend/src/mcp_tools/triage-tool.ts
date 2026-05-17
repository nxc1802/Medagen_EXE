import { DynamicTool } from '@langchain/core/tools';
import { TriageRulesService } from '../services/triage-rules.service.js';
import { logger } from '../utils/logger.js';
import type { TriageInput } from '../types/index.js';

function extractJsonPayload(rawInput: string): string {
  let cleaned = rawInput.trim();

  // Remove code fences if present
  if (cleaned.startsWith('```')) {
    const fenceEnd = cleaned.indexOf('```', 3);
    if (fenceEnd !== -1) {
      cleaned = cleaned.slice(3, fenceEnd).trim();
    }
  }

  if (cleaned.toLowerCase().startsWith('json')) {
    cleaned = cleaned.slice(4).trim();
  }

  if (!cleaned.startsWith('{')) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
  }

  return cleaned;
}

export function createTriageRulesTool(triageService: TriageRulesService): DynamicTool {
  return new DynamicTool({
    name: 'triage_rules',
    description:
      'Use this to apply deterministic triage rules based on symptoms and CV results. ' +
      'Input must be a JSON string containing symptoms object (main_complaint, duration, pain_severity, fever, vision_changes, bleeding, etc.) ' +
      'and optionally cv_results. Returns triage level (emergency/urgent/routine/self-care), red flags, and reasoning.',
    func: async (inputJson: string) => {
      try {
        logger.info('Tool triage_rules called');

        const payload = extractJsonPayload(inputJson);
        const input: TriageInput = JSON.parse(payload);
        const result = triageService.evaluateSymptoms(input);

        return JSON.stringify(result);
      } catch (error) {
        logger.error({ error }, 'triage_rules tool error');
        return JSON.stringify({
          error: 'Failed to evaluate triage rules',
          triage: 'urgent',
          red_flags: [],
          reasoning: 'Error in evaluation, defaulting to urgent for safety'
        });
      }
    }
  });
}

