import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { MedagenAgent } from '../agent/agent-executor.js';
import { SupabaseService } from '../services/supabase.service.js';
import { CarePlanService } from '../services/care-plan.service.js';
import { ConversationHistoryService } from '../services/conversation-history.service.js';
import type { HealthCheckRequest, HealthProfile } from '../types/index.js';
import { logger } from '../utils/logger.js';

const supabaseService = new SupabaseService();
const agent = new MedagenAgent(supabaseService);
const carePlanService = new CarePlanService(supabaseService);
const chatService = new ConversationHistoryService(supabaseService.getClient());

export async function registerRoutes(fastify: FastifyInstance) {
  // POST /api/analyze — run AI triage on symptoms + optional image
  fastify.post<{ Body: HealthCheckRequest }>('/api/analyze', {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const { text, image_url, session_id, location, language } = request.body;
      const { user_id } = (request as any).user;

      if (!text && !image_url) {
        return reply.status(400).send({ error: 'text or image_url is required' });
      }

      try {
        logger.info({ user_id, has_image: !!image_url }, 'Starting AI analysis');

        const [healthProfile, chatSessionId] = await Promise.all([
          supabaseService.getHealthProfile(user_id).catch(() => null),
          chatService.getOrCreateSession(user_id, session_id),
        ]);

        // Save user message to chat history
        await chatService.addUserMessage(chatSessionId, user_id, text, image_url).catch(() => null);

        // Build conversation context from prior turns
        const conversationContext = await chatService.getContextString(chatSessionId, 6).catch(() => undefined);

        const result = await agent.processTriage(
          text || '',
          image_url,
          user_id,
          conversationContext,
          location,
          healthProfile,
          language
        );

        // Save assistant response
        await chatService.addAssistantMessage(
          chatSessionId,
          user_id,
          result.message || result.recommendation?.action || '',
          result
        ).catch(() => null);

        // Persist triage session record
        try {
          await supabaseService.saveSession({
            user_id,
            input_text: text || '',
            image_url,
            triage_result: result,
            location,
          });
        } catch (saveErr) {
          logger.warn({ saveErr }, 'Failed to save session — continuing');
        }

        return reply.send({ ...result, session_id: chatSessionId });
      } catch (error) {
        logger.error({ error }, 'Analysis failed');
        return reply.status(500).send({ error: 'Analysis failed. Please try again.' });
      }
    },
  });

  // GET /api/sessions — list caller's sessions for Care Plan history
  fastify.get('/api/sessions', {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const { user_id } = (request as any).user;
      try {
        const sessions = await supabaseService.getUserSessions(user_id);
        return reply.send({ sessions });
      } catch (error) {
        logger.error({ error }, 'Failed to fetch sessions');
        return reply.status(500).send({ error: 'Failed to fetch sessions' });
      }
    },
  });

  // GET /api/care-plan — lấy care plan đang active của user
  fastify.get('/api/care-plan', {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const { user_id } = (request as any).user;
      try {
        const plan = await supabaseService.getActiveCarePlan(user_id);
        return reply.send({ plan });
      } catch (error) {
        logger.error({ error }, 'Failed to fetch care plan');
        return reply.status(500).send({ error: 'Failed to fetch care plan' });
      }
    },
  });

  // POST /api/care-plan — generate care plan mới bằng Gemini dựa trên lịch sử sessions
  fastify.post('/api/care-plan', {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const { user_id } = (request as any).user;
      try {
        logger.info({ user_id }, 'Generating new care plan');
        const plan = await carePlanService.generateAndSave(user_id);
        return reply.send({ plan });
      } catch (error: any) {
        logger.error({ error }, 'Failed to generate care plan');
        const msg = error?.message || 'Failed to generate care plan';
        return reply.status(500).send({ error: msg });
      }
    },
  });

  // POST /api/upload — upload image via backend (service key bypasses storage RLS)
  fastify.post<{ Body: { base64: string; contentType: string; fileName: string } }>('/api/upload', {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const { user_id } = (request as any).user;
      const { base64, contentType, fileName } = request.body;

      if (!base64 || !contentType) {
        return reply.status(400).send({ error: 'base64 and contentType are required' });
      }

      try {
        const buffer = Buffer.from(base64, 'base64');
        const ext = fileName?.split('.').pop() || contentType.split('/')[1] || 'jpg';
        const path = `${user_id}/${Date.now()}.${ext}`;

        const { error } = await supabaseService.getClient()
          .storage
          .from('medical-images')
          .upload(path, buffer, { contentType, upsert: false });

        if (error) throw error;

        const { data } = supabaseService.getClient()
          .storage
          .from('medical-images')
          .getPublicUrl(path);

        return reply.send({ url: data.publicUrl });
      } catch (error: any) {
        logger.error({ error }, 'Upload failed');
        return reply.status(500).send({ error: error.message || 'Upload failed' });
      }
    },
  });

  // GET /api/health-profile — get current user's health profile
  fastify.get('/api/health-profile', {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const { user_id } = (request as any).user;
      try {
        const profile = await supabaseService.getHealthProfile(user_id);
        return reply.send({ profile });
      } catch (error) {
        logger.error({ error }, 'Failed to fetch health profile');
        return reply.status(500).send({ error: 'Failed to fetch health profile' });
      }
    },
  });

  // PUT /api/health-profile — create or update health profile
  fastify.put<{ Body: Omit<HealthProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'> }>('/api/health-profile', {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const { user_id } = (request as any).user;
      try {
        const profile = await supabaseService.upsertHealthProfile(user_id, request.body);
        return reply.send({ profile });
      } catch (error) {
        logger.error({ error }, 'Failed to save health profile');
        return reply.status(500).send({ error: 'Failed to save health profile' });
      }
    },
  });

  // GET /api/chat/:sessionId/history — conversation history for a chat session
  fastify.get<{ Params: { sessionId: string } }>('/api/chat/:sessionId/history', {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const { user_id } = (request as any).user;
      const { sessionId } = request.params;
      try {
        // Verify session belongs to user
        const session = await supabaseService.getClient()
          .from('conversation_sessions')
          .select('id')
          .eq('id', sessionId)
          .eq('user_id', user_id)
          .maybeSingle();
        if (!session.data) {
          return reply.status(404).send({ error: 'Session not found' });
        }
        const history = await chatService.getHistory(sessionId, 50);
        return reply.send({ history });
      } catch (error) {
        logger.error({ error }, 'Failed to fetch chat history');
        return reply.status(500).send({ error: 'Failed to fetch chat history' });
      }
    },
  });

  // POST /api/chat/:sessionId — follow-up message in an existing session
  fastify.post<{
    Params: { sessionId: string };
    Body: { text: string; image_url?: string; location?: { lat: number; lng: number } };
  }>('/api/chat/:sessionId', {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const { user_id } = (request as any).user;
      const { sessionId } = request.params;
      const { text, image_url, location } = request.body;

      if (!text && !image_url) {
        return reply.status(400).send({ error: 'text or image_url is required' });
      }

      try {
        // Verify session belongs to user
        const { data: session } = await supabaseService.getClient()
          .from('conversation_sessions')
          .select('id')
          .eq('id', sessionId)
          .eq('user_id', user_id)
          .maybeSingle();
        if (!session) {
          return reply.status(404).send({ error: 'Session not found' });
        }

        const [healthProfile, conversationContext] = await Promise.all([
          supabaseService.getHealthProfile(user_id).catch(() => null),
          chatService.getContextString(sessionId, 6),
        ]);

        await chatService.addUserMessage(sessionId, user_id, text, image_url).catch(() => null);

        const result = await agent.processTriage(
          text || '',
          image_url,
          user_id,
          conversationContext,
          location,
          healthProfile
        );

        await chatService.addAssistantMessage(
          sessionId,
          user_id,
          result.message || result.recommendation?.action || '',
          result
        ).catch(() => null);

        return reply.send({ ...result, session_id: sessionId });
      } catch (error) {
        logger.error({ error }, 'Follow-up chat failed');
        return reply.status(500).send({ error: 'Failed to process message' });
      }
    },
  });

  // GET /api/sessions/:id — single session detail
  fastify.get<{ Params: { id: string } }>('/api/sessions/:id', {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      try {
        const session = await supabaseService.getSession(request.params.id);
        return reply.send(session);
      } catch (error) {
        logger.error({ error }, 'Failed to fetch session');
        return reply.status(500).send({ error: 'Failed to fetch session' });
      }
    },
  });
}
