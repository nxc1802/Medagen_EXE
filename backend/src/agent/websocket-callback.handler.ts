/**
 * LangChain Callback Handler for WebSocket Streaming
 * Streams ReAct flow steps to frontend in real-time
 */

import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { AgentAction, AgentFinish } from '@langchain/core/agents';
import { wsConnectionManager } from '../services/websocket.service.js';
import { logger } from '../utils/logger.js';
import type {
  ThoughtMessage,
  ActionStartMessage,
  ActionCompleteMessage,
  ActionErrorMessage,
  ObservationMessage,
  FinalAnswerMessage,
} from '../types/websocket.js';
import { TOOL_DISPLAY_NAMES } from '../types/websocket.js';

export class WebSocketStreamHandler extends BaseCallbackHandler {
  name = 'WebSocketStreamHandler';

  private sessionId: string;
  private actionStartTimes: Map<string, number> = new Map();

  constructor(sessionId: string) {
    super();
    this.sessionId = sessionId;
  }

  /**
   * Called when agent starts thinking
   */
  async onAgentAction(action: AgentAction): Promise<void> {
    try {
      // Send thought message (agent's reasoning)
      if (action.log) {
        const thoughtMsg: ThoughtMessage = {
          type: 'thought',
          content: action.log,
          timestamp: new Date().toISOString(),
          variant: 'intermediate',
        };

        await wsConnectionManager.sendToSession(this.sessionId, thoughtMsg);
        logger.debug(`Sent thought for session ${this.sessionId}`);
      }

      // Send action start
      const toolName = action.tool;
      const displayName = TOOL_DISPLAY_NAMES[toolName] || toolName;

      const actionStartMsg: ActionStartMessage = {
        type: 'action_start',
        tool_name: toolName,
        tool_display_name: displayName,
        timestamp: new Date().toISOString(),
      };

      // Record start time for duration calculation
      this.actionStartTimes.set(toolName, Date.now());

      await wsConnectionManager.sendToSession(this.sessionId, actionStartMsg);
      logger.debug(`Sent action_start for tool ${toolName}, session ${this.sessionId}`);
    } catch (error) {
      logger.error({ error }, 'Error in onAgentAction');
    }
  }

  /**
   * Called when tool execution completes
   */
  async onToolEnd(output: string, _runId: string, _parentRunId?: string, _tags?: string[]): Promise<void> {
    try {
      // Try to parse tool output as JSON (most tools return JSON)
      let results: any;
      try {
        results = JSON.parse(output);
      } catch {
        results = { output };
      }

      // Get tool name from tags or use fallback
      const toolName = _tags?.find((tag: string) => tag in TOOL_DISPLAY_NAMES) || 'unknown';

      // Calculate duration
      const startTime = this.actionStartTimes.get(toolName);
      const duration = startTime ? Date.now() - startTime : 0;
      this.actionStartTimes.delete(toolName);

      // Send action complete
      const actionCompleteMsg: ActionCompleteMessage = {
        type: 'action_complete',
        tool_name: toolName,
        duration_ms: duration,
        results,
        timestamp: new Date().toISOString(),
      };

      await wsConnectionManager.sendToSession(this.sessionId, actionCompleteMsg);
      logger.debug(`Sent action_complete for tool ${toolName}, session ${this.sessionId}`);

      // Send observation if results contain predictions/confidence
      if (results.predictions || results.confidence) {
        const observationMsg: ObservationMessage = {
          type: 'observation',
          tool_name: toolName,
          findings: results,
          confidence: results.confidence || (results.predictions?.[0]?.confidence ?? 0),
          timestamp: new Date().toISOString(),
        };

        await wsConnectionManager.sendToSession(this.sessionId, observationMsg);
        logger.debug(`Sent observation for tool ${toolName}, session ${this.sessionId}`);
      }
    } catch (error) {
      logger.error({ error }, 'Error in onToolEnd');
    }
  }

  /**
   * Called when tool execution fails
   */
  async onToolError(error: Error, _runId: string, _parentRunId?: string, _tags?: string[]): Promise<void> {
    try {
      const toolName = _tags?.find((tag: string) => tag in TOOL_DISPLAY_NAMES) || 'unknown';

      // Calculate duration
      const startTime = this.actionStartTimes.get(toolName);
      const duration = startTime ? Date.now() - startTime : 0;
      this.actionStartTimes.delete(toolName);

      const actionErrorMsg: ActionErrorMessage = {
        type: 'action_error',
        tool_name: toolName,
        error_code: 'TOOL_ERROR',
        error_message: error.message || 'Tool execution failed',
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      };

      await wsConnectionManager.sendToSession(this.sessionId, actionErrorMsg);
      logger.debug(`Sent action_error for tool ${toolName}, session ${this.sessionId}`);
    } catch (err) {
      logger.error({ error: err }, 'Error in onToolError');
    }
  }

  /**
   * Called when agent completes (final answer)
   */
  async onAgentFinish(finish: AgentFinish): Promise<void> {
    try {
      // Send final thought
      if (finish.log) {
        const thoughtMsg: ThoughtMessage = {
          type: 'thought',
          content: finish.log,
          timestamp: new Date().toISOString(),
          variant: 'final',
        };

        await wsConnectionManager.sendToSession(this.sessionId, thoughtMsg);
      }

      // Send final answer
      const finalAnswerMsg: FinalAnswerMessage = {
        type: 'final_answer',
        result: finish.returnValues as any,
        timestamp: new Date().toISOString(),
      };

      await wsConnectionManager.sendToSession(this.sessionId, finalAnswerMsg);
      logger.debug(`Sent final_answer for session ${this.sessionId}`);
    } catch (error) {
      logger.error({ error }, 'Error in onAgentFinish');
    }
  }

  /**
   * Called when LLM starts
   */
  async onLLMStart(): Promise<void> {
    // Optional: can send a message indicating LLM is thinking
  }

  /**
   * Called when LLM ends
   */
  async onLLMEnd(): Promise<void> {
    // Optional: can send a message indicating LLM finished
  }

  /**
   * Called on any error
   */
  async onChainError(error: Error): Promise<void> {
    try {
      wsConnectionManager.sendError(this.sessionId, 'CHAIN_ERROR', error.message);
      logger.error({ error, sessionId: this.sessionId }, 'Chain error');
    } catch (err) {
      logger.error({ error: err }, 'Error in onChainError');
    }
  }
}
