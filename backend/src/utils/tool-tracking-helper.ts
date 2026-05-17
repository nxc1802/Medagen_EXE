import { ToolExecutionTrackerService, type ToolExecution } from '../services/tool-execution-tracker.service.js';
import type { TriageResult } from '../types/index.js';

/**
 * Helper to track tool executions from agent results
 * This extracts tool execution data from TriageResult and tracks them
 */
export class ToolTrackingHelper {
  /**
   * Track CV tool execution from triage result
   */
  static async trackCVExecution(
    tracker: ToolExecutionTrackerService,
    sessionId: string,
    _messageId: string,
    triageResult: TriageResult,
    executionTime: number
  ): Promise<void> {
    const cvFindings = triageResult.cv_findings;
    
    if (cvFindings.model_used === 'none' || !cvFindings.raw_output?.top_predictions) {
      return; // No CV execution
    }

    const toolName = cvFindings.model_used;
    const toolDisplayName = this.getToolDisplayName(toolName);
    
    const execution: ToolExecution = {
      tool_name: toolName,
      tool_display_name: toolDisplayName,
      execution_order: tracker.getNextExecutionOrder(),
      input_data: {
        model: toolName,
        has_image: true
      },
      output_data: {
        top_conditions: cvFindings.raw_output.top_predictions.map((p: any) => ({
          condition: p.condition,
          probability: p.probability,
          confidence: (p.probability * 100).toFixed(1) + '%'
        })),
        model_used: toolName
      },
      execution_time_ms: executionTime,
      status: 'success'
    };

    await tracker.trackToolExecution(sessionId, execution);
  }

  /**
   * Track RAG/Guideline retrieval execution
   * This is inferred from triage result and suspected conditions
   */
  static async trackRAGExecution(
    tracker: ToolExecutionTrackerService,
    sessionId: string,
    _messageId: string,
    triageResult: TriageResult,
    userText: string,
    executionTime: number,
    guidelinesCount?: number
  ): Promise<void> {
    // RAG is always called in triage workflow
    const execution: ToolExecution = {
      tool_name: 'rag_query',
      tool_display_name: 'Medical Guidelines Retrieval',
      execution_order: tracker.getNextExecutionOrder(),
      input_data: {
        symptoms: userText,
        suspected_conditions: triageResult.suspected_conditions.map(c => c.name),
        triage_level: triageResult.triage_level
      },
      output_data: {
        guidelines_retrieved: guidelinesCount || 0,
        triage_level: triageResult.triage_level,
        suspected_conditions: triageResult.suspected_conditions
      },
      execution_time_ms: executionTime,
      status: 'success'
    };

    await tracker.trackToolExecution(sessionId, execution);
  }

  /**
   * Track Triage Rules execution
   */
  static async trackTriageRulesExecution(
    tracker: ToolExecutionTrackerService,
    sessionId: string,
    _messageId: string,
    triageResult: TriageResult,
    userText: string,
    executionTime: number
  ): Promise<void> {
    const execution: ToolExecution = {
      tool_name: 'triage_rules',
      tool_display_name: 'Triage Classification',
      execution_order: tracker.getNextExecutionOrder(),
      input_data: {
        symptoms: userText,
        has_cv_results: triageResult.cv_findings.model_used !== 'none'
      },
      output_data: {
        triage_level: triageResult.triage_level,
        red_flags: triageResult.red_flags,
        reasoning: (triageResult as any).reasoning || 'Triage rules evaluation completed'
      },
      execution_time_ms: executionTime,
      status: 'success'
    };

    await tracker.trackToolExecution(sessionId, execution);
  }

  /**
   * Track Hospital/Maps execution
   */
  static async trackMapsExecution(
    tracker: ToolExecutionTrackerService,
    sessionId: string,
    _messageId: string,
    nearestClinic: any,
    condition: string | undefined,
    executionTime: number
  ): Promise<void> {
    if (!nearestClinic) {
      return; // No hospital search
    }

    const execution: ToolExecution = {
      tool_name: 'maps',
      tool_display_name: 'Hospital Search',
      execution_order: tracker.getNextExecutionOrder(),
      input_data: {
        condition: condition,
        location: 'user_location'
      },
      output_data: {
        nearest_clinic: {
          name: nearestClinic.name,
          distance_km: nearestClinic.distance_km,
          address: nearestClinic.address,
          rating: nearestClinic.rating
        }
      },
      execution_time_ms: executionTime,
      status: 'success'
    };

    await tracker.trackToolExecution(sessionId, execution);
  }

  /**
   * Get tool display name
   */
  private static getToolDisplayName(toolName: string): string {
    const displayNames: Record<string, string> = {
      'derm_cv': 'Dermatology CV Analysis',
      'eye_cv': 'Eye Condition Analysis',
      'wound_cv': 'Wound Assessment',
      'triage_rules': 'Triage Classification',
      'rag_query': 'Medical Guidelines Retrieval',
      'guideline_retrieval': 'Medical Guidelines Retrieval',
      'knowledge_base': 'Structured Knowledge Search',
      'maps': 'Hospital Search'
    };

    return displayNames[toolName] || toolName;
  }
}

