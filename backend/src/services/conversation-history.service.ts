import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import type { ConversationMessage } from '../types/index.js';

export class ConversationHistoryService {
  private supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabaseClient = supabaseClient;
  }

  /**
   * Create or get existing session
   */
  async getOrCreateSession(userId: string, sessionId?: string): Promise<string> {
    try {
      // If session_id provided, verify it exists and belongs to user
      if (sessionId) {
        const { data, error } = await this.supabaseClient
          .from('conversation_sessions')
          .select('id')
          .eq('id', sessionId)
          .eq('user_id', userId)
          .single();

        if (!error && data) {
          logger.info(`Using existing session: ${sessionId}`);
          return sessionId;
        }
      }

      // Create new session
      const newSessionId = uuidv4();
      const { error } = await this.supabaseClient
        .from('conversation_sessions')
        .insert({
          id: newSessionId,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        logger.error({ error }, 'Failed to create session');
        throw error;
      }

      logger.info(`Created new session: ${newSessionId}`);
      return newSessionId;
    } catch (error) {
      logger.error({ error }, 'Error in getOrCreateSession');
      throw error;
    }
  }

  /**
   * Add user message to conversation history
   */
  async addUserMessage(
    sessionId: string,
    userId: string,
    text?: string,
    imageUrl?: string
  ): Promise<ConversationMessage> {
    try {
      const message: ConversationMessage = {
        id: uuidv4(),
        session_id: sessionId,
        user_id: userId,
        role: 'user',
        content: text || '[Hình ảnh được gửi]',
        image_url: imageUrl,
        created_at: new Date().toISOString()
      };

      const { error } = await this.supabaseClient
        .from('conversation_history')
        .insert(message);

      if (error) {
        logger.error({ error }, 'Failed to add user message');
        throw error;
      }

      logger.info(`Added user message to session ${sessionId}`);
      return message;
    } catch (error) {
      logger.error({ error }, 'Error in addUserMessage');
      throw error;
    }
  }

  /**
   * Add assistant response to conversation history
   */
  async addAssistantMessage(
    sessionId: string,
    userId: string,
    content: string,
    triageResult?: any
  ): Promise<ConversationMessage> {
    try {
      const message: ConversationMessage = {
        id: uuidv4(),
        session_id: sessionId,
        user_id: userId,
        role: 'assistant',
        content,
        triage_result: triageResult,
        created_at: new Date().toISOString()
      };

      const { error } = await this.supabaseClient
        .from('conversation_history')
        .insert(message);

      if (error) {
        logger.error({ error }, 'Failed to add assistant message');
        throw error;
      }

      // Update session timestamp
      await this.supabaseClient
        .from('conversation_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      logger.info(`Added assistant message to session ${sessionId}`);
      return message;
    } catch (error) {
      logger.error({ error }, 'Error in addAssistantMessage');
      throw error;
    }
  }

  /**
   * Get conversation history for a session
   */
  async getHistory(
    sessionId: string,
    limit: number = 10
  ): Promise<ConversationMessage[]> {
    try {
      const { data, error } = await this.supabaseClient
        .from('conversation_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error({ error }, 'Failed to get conversation history');
        throw error;
      }

      // Return in chronological order (oldest first)
      return (data || []).reverse();
    } catch (error) {
      logger.error({ error }, 'Error in getHistory');
      return [];
    }
  }

  /**
   * Get formatted context string for LLM
   */
  async getContextString(sessionId: string, limit: number = 5): Promise<string> {
    try {
      const history = await this.getHistory(sessionId, limit);
      
      if (history.length === 0) {
        return '';
      }

      const contextLines = history.map(msg => {
        if (msg.role === 'user') {
          return `User: ${msg.content}${msg.image_url ? ' [có hình ảnh]' : ''}`;
        } else {
          return `Assistant: ${msg.content}`;
        }
      });

      return `\n--- Lịch sử hội thoại gần đây ---\n${contextLines.join('\n')}\n--- Tin nhắn hiện tại ---\n`;
    } catch (error) {
      logger.error({ error }, 'Error in getContextString');
      return '';
    }
  }

  /**
   * Clear old conversations (cleanup job)
   */
  async clearOldSessions(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await this.supabaseClient
        .from('conversation_sessions')
        .delete()
        .lt('updated_at', cutoffDate.toISOString())
        .select('id');

      if (error) {
        logger.error({ error }, 'Failed to clear old sessions');
        throw error;
      }

      const deletedCount = data?.length || 0;
      logger.info(`Cleared ${deletedCount} old sessions`);
      return deletedCount;
    } catch (error) {
      logger.error({ error }, 'Error in clearOldSessions');
      return 0;
    }
  }
}

