import type { FastifyInstance } from 'fastify';
import { SupabaseService } from '../services/supabase.service.js';
import { ConversationHistoryService } from '../services/conversation-history.service.js';
import { MedagenAgent } from '../agent/agent-executor.js';
import { wsConnectionManager } from '../services/websocket.service.js';
import { logger } from '../utils/logger.js';
import { TriageRulesService } from '../services/triage-rules.service.js';
import type { HealthCheckRequest } from '../types/index.js';

export async function registerRoutes(fastify: FastifyInstance) {
  const supabaseService = new SupabaseService();
  const conversationService = new ConversationHistoryService(supabaseService.getClient());

  // 1. POST /api/v1/sessions - Create or get a session
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

  // 2. GET /api/v1/sessions/:session_id/history - Get conversation history
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

  // 3. POST /api/v1/triage - Single-turn triage REST API
  fastify.post('/api/v1/triage', async (request, reply) => {
    try {
      const body = request.body as HealthCheckRequest & { input_text?: string };
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

      const agent = new MedagenAgent(supabaseService);
      await agent.initialize();

      // Execute triage synchronously - passing userId, undefined (for context), and location in correct order
      const result = await agent.processTriage(userText, imageUrl, userId, undefined, location);

      // Save session in database for history tracking
      await supabaseService.saveSession({
        user_id: userId,
        input_text: userText || '[Gửi ảnh chẩn đoán]',
        image_url: imageUrl,
        triage_result: result,
        location
      });

      // Map triage level display y như Next.js specs
      let levelCode = 'GREEN';
      let levelDisplay = 'MÀU XANH LÁ (Tự chăm sóc / Khám thường)';
      if (result.triage_level === 'emergency') {
        levelCode = 'RED';
        levelDisplay = 'MÀU ĐỎ (Nguy cấp - Cần cấp cứu ngay)';
      } else if (result.triage_level === 'urgent') {
        levelCode = 'YELLOW';
        levelDisplay = 'MÀU VÀNG (Cần theo dõi / Khám sớm)';
      }

      return reply.status(200).send({
        success: true,
        triage_level: levelDisplay,
        analysis: {
          suspected_condition: result.suspected_conditions?.[0]?.name || 'Chưa xác định cụ thể',
          cv_results: result.cv_findings?.raw_output?.top_predictions || [],
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

  // 4. GET /api/v1/chat - WebSocket Chat Stream for ReAct Agent
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

    // Register active socket connection
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

        // Save User Message to Database
        await conversationService.addUserMessage(sessionId, userId, text, imageUrl);

        // Fetch recent context history
        const context = await conversationService.getContextString(sessionId, 5);

        // --- GOLD STANDARD 3: Triage-First Rendering (< 50ms) ---
        // Run rules engine thô (~2ms) and immediately shoot initial triage_result event to client
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

        // 1. Initial Thought Message
        connection.socket.send(JSON.stringify({
          event: 'agent_response',
          data: { text: 'Tôi đang tiếp nhận thông tin và phân tích triệu chứng của bạn, xin vui lòng đợi trong giây lát...' }
        }));

        // Trigger ReAct streaming thoughts simulated step-by-step
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

        // Initialize agent
        const agent = new MedagenAgent(supabaseService);
        await agent.initialize();

        // 2. Image Analysis Tool Execution (if image provided)
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

        // --- GOLD STANDARD 4: Token Streaming ---
        // Run full agent loop - passing callback to send chunks in real-time
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

        // Save Assistant response to history
        const finalMessage = result.message || 'Chẩn đoán hoàn tất.';
        await conversationService.addAssistantMessage(sessionId, userId, finalMessage, {
          triage_level: result.triage_level,
          suspected_conditions: result.suspected_conditions
        });

        // 3. Send CV results event if image was analyzed
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

        // 4. Send final Triage result to sync colors precisely
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

        // 5. Send final agent text response (full message)
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
}
