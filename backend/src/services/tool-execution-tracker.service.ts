import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

export interface ToolExecution {
  tool_name: string;
  tool_display_name: string;
  execution_order: number;
  input_data: any;
  output_data: any;
  execution_time_ms: number;
  status: 'success' | 'error' | 'skipped';
  error_message?: string;
}

export class ToolExecutionTrackerService {
  private supabaseClient: SupabaseClient;
  private currentMessageId: string | null = null;
  private executionOrder: number = 0;

  constructor(supabaseClient: SupabaseClient) {
    this.supabaseClient = supabaseClient;
  }

  /**
   * Start tracking for a new message
   */
  startTracking(messageId: string): void {
    this.currentMessageId = messageId;
    this.executionOrder = 0;
  }

  /**
   * Track a tool execution
   */
  async trackToolExecution(
    sessionId: string,
    execution: ToolExecution
  ): Promise<void> {
    try {
      if (!this.currentMessageId) {
        logger.warn('No message ID set for tool execution tracking');
        return;
      }

      const executionData = {
        session_id: sessionId,
        message_id: this.currentMessageId,
        tool_name: execution.tool_name,
        tool_display_name: execution.tool_display_name,
        execution_order: execution.execution_order,
        input_data: execution.input_data,
        output_data: execution.output_data,
        execution_time_ms: execution.execution_time_ms,
        status: execution.status,
        error_message: execution.error_message || null,
        created_at: new Date().toISOString()
      };

      const { error } = await this.supabaseClient
        .from('tool_executions')
        .insert(executionData);

      if (error) {
        logger.error({ error }, 'Failed to track tool execution');
        // Don't throw - tracking failure shouldn't break the workflow
      } else {
        logger.info(`[REPORT] ✓ Tool execution saved to database: ${execution.tool_display_name} (${execution.tool_name}, order: ${execution.execution_order}, time: ${execution.execution_time_ms}ms)`);
        logger.debug(`[REPORT] Tool execution data: ${JSON.stringify({
          tool: execution.tool_name,
          input: Object.keys(execution.input_data || {}),
          output_keys: Object.keys(execution.output_data || {})
        })}`);
      }
    } catch (error) {
      logger.error({ error }, 'Error tracking tool execution');
      // Don't throw - tracking is non-critical
    }
  }

  /**
   * Get next execution order number
   */
  getNextExecutionOrder(): number {
    this.executionOrder++;
    return this.executionOrder;
  }

  /**
   * Get all tool executions for a message
   */
  async getToolExecutionsForMessage(messageId: string): Promise<ToolExecution[]> {
    try {
      const { data, error } = await this.supabaseClient
        .from('tool_executions')
        .select('*')
        .eq('message_id', messageId)
        .order('execution_order', { ascending: true });

      if (error) {
        logger.error({ error }, 'Failed to get tool executions');
        return [];
      }

      return (data || []).map(row => ({
        tool_name: row.tool_name,
        tool_display_name: row.tool_display_name,
        execution_order: row.execution_order,
        input_data: row.input_data,
        output_data: row.output_data,
        execution_time_ms: row.execution_time_ms,
        status: row.status,
        error_message: row.error_message
      }));
    } catch (error) {
      logger.error({ error }, 'Error getting tool executions');
      return [];
    }
  }

  /**
   * Get all tool executions for a session
   */
  async getToolExecutionsForSession(sessionId: string): Promise<ToolExecution[]> {
    try {
      const { data, error } = await this.supabaseClient
        .from('tool_executions')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .order('execution_order', { ascending: true });

      if (error) {
        logger.error({ error }, 'Failed to get tool executions for session');
        return [];
      }

      return (data || []).map(row => ({
        tool_name: row.tool_name,
        tool_display_name: row.tool_display_name,
        execution_order: row.execution_order,
        input_data: row.input_data,
        output_data: row.output_data,
        execution_time_ms: row.execution_time_ms,
        status: row.status,
        error_message: row.error_message
      }));
    } catch (error) {
      logger.error({ error }, 'Error getting tool executions for session');
      return [];
    }
  }

  /**
   * Reset tracking state
   */
  reset(): void {
    this.currentMessageId = null;
    this.executionOrder = 0;
  }
}

