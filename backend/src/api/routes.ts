import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { MedagenAgent } from '../agent/agent-executor.js';
import { SupabaseService } from '../services/supabase.service.js';
import { CarePlanService } from '../services/care-plan.service.js';
import { ConversationHistoryService } from '../services/conversation-history.service.js';
import { wsConnectionManager } from '../services/websocket.service.js';
import { TriageRulesService } from '../services/triage-rules.service.js';
import type { HealthCheckRequest, HealthProfile } from '../types/index.js';
import { logger } from '../utils/logger.js';

export async function registerRoutes(fastify: FastifyInstance) {
  const supabaseService = new SupabaseService();
  const agent = new MedagenAgent(supabaseService);
  const carePlanService = new CarePlanService(supabaseService);
  const chatService = new ConversationHistoryService(supabaseService.getClient());
  const conversationService = chatService; // Alias for backward compatibility with v1 API

  // ==========================================
  // 1. WebSocket & REST APIs (from main branch)
  // ==========================================

  // POST /api/v1/sessions - Create or get a session
  fastify.post('/api/v1/sessions', async (request, reply) => {
    try {
      const { user_id } = request.body as { user_id: string };
      if (!user_id) {
        return reply.status(400).send({
          success: false,
          error: 'user_id is required'
        });
      }

      const sessionId = await conversationService.getOrCreateSession(user_id);
      return reply.status(201).send({
        success: true,
        session_id: sessionId,
        created_at: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error({ error }, 'Error in POST /api/v1/sessions');
      return reply.status(500).send({
        success: false,
        error: error.message || 'Internal Server Error'
      });
    }
  });

  // GET /api/v1/sessions/:session_id/history - Get conversation history
  fastify.get('/api/v1/sessions/:session_id/history', async (request, reply) => {
    try {
      const { session_id } = request.params as { session_id: string };
      if (!session_id) {
        return reply.status(400).send({
          success: false,
          error: 'session_id is required'
        });
      }

      const history = await conversationService.getHistory(session_id, 20);
      return reply.status(200).send({
        success: true,
        session_id,
        history: history.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          image_url: msg.image_url,
          triage_result: msg.triage_result,
          created_at: msg.created_at
        }))
      });
    } catch (error: any) {
      logger.error({ error }, 'Error in GET /api/v1/sessions/:session_id/history');
      return reply.status(500).send({
        success: false,
        error: error.message || 'Internal Server Error'
      });
    }
  });

  // POST /api/v1/triage - Single-turn triage REST API
  fastify.post('/api/v1/triage', async (request, reply) => {
    try {
      const body = request.body as HealthCheckRequest & { input_text?: string; user_id: string };
      const userId = body.user_id;
      const userText = body.text || body.input_text || '';
      const imageUrl = body.image_url;
      const location = body.location;

      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'user_id is required'
        });
      }

      if (!userText && !imageUrl) {
        return reply.status(400).send({
          success: false,
          error: 'Either text or image_url must be provided'
        });
      }

      logger.info(`REST Triage request received from user: ${userId}`);

      await agent.initialize();

      // Execute triage synchronously
      const result = await agent.processTriage(userText, imageUrl, userId, undefined, location);

      // Save session in database for history tracking
      await supabaseService.saveSession({
        user_id: userId,
        input_text: userText || '[Gửi ảnh chẩn đoán]',
        image_url: imageUrl,
        triage_result: result,
        location
      });

      let levelDisplay = 'MÀU XANH LÁ (Tự chăm sóc / Khám thường)';
      if (result.triage_level === 'emergency') {
        levelDisplay = 'MÀU ĐỎ (Nguy cấp - Cần cấp cứu ngay)';
      } else if (result.triage_level === 'urgent') {
        levelDisplay = 'MÀU VÀNG (Cần theo dõi / Khám sớm)';
      }

      return reply.status(200).send({
        success: true,
        triage_level: levelDisplay,
        analysis: {
          suspected_condition: result.suspected_conditions?.[0]?.name || 'Chưa xác định cụ thể',
          cv_results: (result.cv_findings?.raw_output?.top_predictions || []).map((p: any) => ({
            condition: p.condition || p.name,
            probability: p.probability ?? p.prob ?? 0
          })),
          explanation: result.symptom_summary || 'Không có mô tả',
          recommendations: [
            result.recommendation?.action,
            result.recommendation?.home_care_advice,
            result.recommendation?.warning_signs
          ].filter(Boolean)
        },
        nearby_hospitals: result.nearest_clinic ? [
          {
            name: result.nearest_clinic.name,
            address: result.nearest_clinic.address,
            distance: `${result.nearest_clinic.distance_km.toFixed(1)} km`,
            phone: 'Liên hệ cấp cứu 115'
          }
        ] : []
      });
    } catch (error: any) {
      logger.error({ error }, 'Error in POST /api/v1/triage');
      return reply.status(500).send({
        success: false,
        error: error.message || 'Internal Server Error'
      });
    }
  });

  // GET /api/v1/chat - WebSocket Chat Stream for ReAct Agent
  fastify.get('/api/v1/chat', { websocket: true }, (connection: any, req: any) => {
    const query = req.query as { session_id?: string; user_id?: string };
    const sessionId = query.session_id;
    const userId = query.user_id;

    if (!sessionId || !userId) {
      logger.warn('WebSocket connection rejected: Missing session_id or user_id');
      connection.socket.send(JSON.stringify({
        event: 'error',
        data: { message: 'session_id and user_id are required as query parameters.' }
      }));
      connection.socket.close();
      return;
    }

    wsConnectionManager.addConnection(sessionId, connection.socket);

    connection.socket.on('message', async (rawMessage: any) => {
      try {
        const payload = JSON.parse(rawMessage.toString());
        if (payload.event !== 'message' || !payload.data) {
          logger.warn(`Unknown WS event: ${payload.event}`);
          return;
        }

        const { text, image_url: imageUrl, location } = payload.data;
        logger.info(`Received WS message in session ${sessionId}: "${text?.substring(0, 40)}..."`);

        await conversationService.addUserMessage(sessionId, userId, text, imageUrl);

        const context = await conversationService.getContextString(sessionId, 5);

        const triageRulesService = new TriageRulesService();
        const fastTriage = triageRulesService.evaluateSymptoms({
          symptoms: {
            main_complaint: text || '',
            context: context
          } as any
        });
        
        let initialLevelCode = 'GREEN';
        let initialLevelDisplay = 'MÀU XANH LÁ (Tự chăm sóc / Khám thường)';
        if (fastTriage.triage === 'emergency') {
          initialLevelCode = 'RED';
          initialLevelDisplay = 'MÀU ĐỎ (Nguy cấp - Cần cấp cứu ngay)';
        } else if (fastTriage.triage === 'urgent') {
          initialLevelCode = 'YELLOW';
          initialLevelDisplay = 'MÀU VÀNG (Cần theo dõi / Khám sớm)';
        }

        connection.socket.send(JSON.stringify({
          event: 'triage_result',
          data: {
            level: initialLevelCode,
            level_display: initialLevelDisplay,
            suspected_condition: 'Đang phân tích...',
            recommendations: [
              'Hệ thống đang tiếp nhận thông tin và định tuyến y tế ngay lập tức...'
            ]
          }
        }));

        connection.socket.send(JSON.stringify({
          event: 'agent_response',
          data: { text: 'Tôi đang tiếp nhận thông tin và phân tích triệu chứng của bạn, xin vui lòng đợi trong giây lát...' }
        }));

        setTimeout(() => {
          connection.socket.send(JSON.stringify({
            event: 'thought',
            data: {
              type: 'thought',
              content: 'Phân loại ý định của người dùng và kiểm tra xem có đi kèm hình ảnh y tế hay không...',
              timestamp: new Date().toISOString()
            }
          }));
        }, 300);

        await agent.initialize();

        if (imageUrl) {
          setTimeout(() => {
            connection.socket.send(JSON.stringify({
              event: 'action_start',
              data: {
                type: 'action_start',
                tool_name: 'cv_analysis',
                tool_display_name: 'Chẩn đoán hình ảnh AI',
                timestamp: new Date().toISOString()
              }
            }));
          }, 800);
        }

        const result = await agent.processTriage(
          text,
          imageUrl,
          userId,
          context,
          location,
          (token: string) => {
            connection.socket.send(JSON.stringify({
              event: 'agent_response_chunk',
              data: {
                text: token
              }
            }));
          }
        );

        const finalMessage = result.message || 'Chẩn đoán hoàn tất.';
        await conversationService.addAssistantMessage(sessionId, userId, finalMessage, {
          triage_level: result.triage_level,
          suspected_conditions: result.suspected_conditions
        });

        if (imageUrl && result.cv_findings && result.cv_findings.model_used !== 'none') {
          const modelUsed = result.cv_findings.model_used;
          const predictions = result.cv_findings.raw_output?.top_predictions?.map((p: any) => ({
            class: p.condition,
            confidence: p.probability
          })) || [];

          connection.socket.send(JSON.stringify({
            event: 'cv_analysis',
            data: {
              target_area: modelUsed.replace('_cv', ''),
              predictions
            }
          }));
        }

        let levelCode = 'GREEN';
        let levelDisplay = 'MÀU XANH LÁ (Tự chăm sóc / Khám thường)';
        if (result.triage_level === 'emergency') {
          levelCode = 'RED';
          levelDisplay = 'MÀU ĐỎ (Nguy cấp - Cần cấp cứu ngay)';
        } else if (result.triage_level === 'urgent') {
          levelCode = 'YELLOW';
          levelDisplay = 'MÀU VÀNG (Cần theo dõi / Khám sớm)';
        }

        connection.socket.send(JSON.stringify({
          event: 'triage_result',
          data: {
            level: levelCode,
            level_display: levelDisplay,
            suspected_condition: result.suspected_conditions?.[0]?.name || 'Không xác định',
            recommendations: [
              result.recommendation?.action,
              result.recommendation?.home_care_advice,
              result.recommendation?.warning_signs
            ].filter(Boolean)
          }
        }));

        connection.socket.send(JSON.stringify({
          event: 'agent_response',
          data: {
            text: finalMessage
          }
        }));

      } catch (err: any) {
        logger.error({ err }, 'Error processing WS message');
        connection.socket.send(JSON.stringify({
          event: 'error',
          data: { message: 'Có lỗi xảy ra trong quá trình xử lý tin nhắn: ' + err.message }
        }));
      }
    });

    connection.socket.on('close', () => {
      wsConnectionManager.removeConnection(sessionId);
    });
  });

  // ==========================================
  // 2. React Frontend REST APIs (from feature branch)
  // ==========================================

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

        await chatService.addUserMessage(chatSessionId, user_id, text, image_url).catch(() => null);

        const conversationContext = await chatService.getContextString(chatSessionId, 6).catch(() => undefined);

        await agent.initialize();

        const result = await agent.processTriage(
          text || '',
          image_url,
          user_id,
          conversationContext,
          location,
          healthProfile,
          language
        );

        await chatService.addAssistantMessage(
          chatSessionId,
          user_id,
          result.message || result.recommendation?.action || '',
          result
        ).catch(() => null);

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

  // GET /api/sessions/:id — single session detail (ownership enforced)
  fastify.get<{ Params: { id: string } }>('/api/sessions/:id', {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const { user_id } = (request as any).user;
      try {
        const { data: session, error } = await supabaseService.getClient()
          .from('sessions')
          .select('*')
          .eq('id', request.params.id)
          .eq('user_id', user_id)
          .maybeSingle();

        if (error) throw error;
        if (!session) {
          return reply.status(404).send({ error: 'Session not found' });
        }
        return reply.send(session);
      } catch (error) {
        logger.error({ error }, 'Failed to fetch session');
        return reply.status(500).send({ error: 'Failed to fetch session' });
      }
    },
  });
}
