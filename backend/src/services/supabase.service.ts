import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { TriageResult } from '../types/index.js';

export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(
      config.supabase.url,
      config.supabase.serviceKey
    );
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  async saveSession(sessionData: {
    user_id: string;
    input_text: string;
    image_url?: string;
    triage_result: TriageResult;
    location?: { lat: number; lng: number };
  }): Promise<void> {
    try {
      const { error } = await this.client
        .from('sessions')
        .insert({
          user_id: sessionData.user_id,
          input_text: sessionData.input_text,
          image_url: sessionData.image_url,
          triage_level: sessionData.triage_result.triage_level,
          triage_result: sessionData.triage_result,
          location: sessionData.location,
          created_at: new Date().toISOString()
        });

      if (error) {
        logger.error({ error }, 'Error saving session');
        throw error;
      }

      logger.info('Session saved successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to save session');
      throw error;
    }
  }

  async getSession(sessionId: string) {
    try {
      const { data, error } = await this.client
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        logger.error({ error }, 'Error fetching session');
        throw error;
      }

      return data;
    } catch (error) {
      logger.error({ error }, 'Failed to fetch session');
      throw error;
    }
  }

  async verifyToken(token: string): Promise<{ user_id: string } | null> {
    try {
      const { data, error } = await this.client.auth.getUser(token);

      if (error || !data.user) {
        logger.warn('Invalid token');
        return null;
      }

      return { user_id: data.user.id };
    } catch (error) {
      logger.error({ error }, 'Token verification failed');
      return null;
    }
  }
}

