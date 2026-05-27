import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { TriageResult, HealthProfile } from '../types/index.js';

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

  async getUserSessions(userId: string) {
    try {
      const { data, error } = await this.client
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        logger.error({ error }, 'Error fetching user sessions');
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error({ error }, 'Failed to fetch user sessions');
      throw error;
    }
  }

  async getActiveCarePlan(userId: string) {
    const { data } = await this.client
      .from('care_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();
    return data;
  }

  async saveCarePlan(plan: {
    user_id: string;
    source_session_ids: string[];
    conditions: string[];
    lifestyle: any;
    nutrition: any;
    exercise: any;
    otc_suggestions: any;
    summary: string;
    next_checkup_date: string | null;
  }) {
    // Deactivate existing active plan
    await this.client
      .from('care_plans')
      .update({ is_active: false })
      .eq('user_id', plan.user_id)
      .eq('is_active', true);

    const { data, error } = await this.client
      .from('care_plans')
      .insert({ ...plan, is_active: true })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUserMedicalHistory(userId: string) {
    const { data } = await this.client
      .from('user_medical_history')
      .select('*')
      .eq('user_id', userId);
    return data || [];
  }

  async getHealthProfile(userId: string): Promise<HealthProfile | null> {
    const { data, error } = await this.client
      .from('health_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      logger.error({ error }, 'Error fetching health profile');
      throw error;
    }
    return data;
  }

  async upsertHealthProfile(userId: string, profile: Omit<HealthProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<HealthProfile> {
    const { data, error } = await this.client
      .from('health_profiles')
      .upsert(
        { ...profile, user_id: userId, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      .select()
      .single();
    if (error) {
      logger.error({ error }, 'Error upserting health profile');
      throw error;
    }
    return data;
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

