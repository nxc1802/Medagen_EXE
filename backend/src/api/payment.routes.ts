import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { PaymentService, type PlanKey } from '../services/payment.service.js';
import { SupabaseService } from '../services/supabase.service.js';
import { logger } from '../utils/logger.js';

const supabaseService = new SupabaseService();
const paymentService = new PaymentService(supabaseService.getClient());

export async function registerPaymentRoutes(fastify: FastifyInstance) {
  // POST /api/payment/create-order
  fastify.post<{ Body: { plan: string } }>('/api/payment/create-order', {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const { user_id, email } = (request as any).user;
      const { plan } = request.body;

      if (!['pro_monthly', 'pro_annual'].includes(plan)) {
        return reply.status(400).send({ error: 'Invalid plan. Use pro_monthly or pro_annual.' });
      }

      try {
        const result = await paymentService.createOrder(user_id, plan as PlanKey, email ?? '');
        return reply.send(result);
      } catch (err) {
        logger.error({ err }, 'Failed to create PayOS order');
        return reply.status(500).send({ error: 'Failed to create payment order' });
      }
    },
  });

  // POST /api/payment/webhook  (no auth — called by PayOS server)
  fastify.post('/api/payment/webhook', {
    handler: async (request, reply) => {
      try {
        const result = await paymentService.handleWebhook(request.body);
        return reply.send({ success: result.success });
      } catch (err) {
        logger.error({ err }, 'PayOS webhook error');
        return reply.status(200).send({ success: false }); // always 200 to stop retries
      }
    },
  });

  // GET /api/payment/status/:orderCode
  fastify.get<{ Params: { orderCode: string } }>('/api/payment/status/:orderCode', {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const orderCode = Number(request.params.orderCode);
      if (isNaN(orderCode)) {
        return reply.status(400).send({ error: 'Invalid orderCode' });
      }
      try {
        const info = await paymentService.getOrderStatus(orderCode);
        return reply.send(info);
      } catch (err) {
        logger.error({ err }, 'Failed to fetch PayOS order status');
        return reply.status(500).send({ error: 'Failed to fetch order status' });
      }
    },
  });

  // GET /api/payment/subscription  — current user's subscription
  fastify.get('/api/payment/subscription', {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const { user_id } = (request as any).user;
      try {
        const sub = await paymentService.getUserSubscription(user_id);
        return reply.send(sub ?? { plan: 'free', status: 'active' });
      } catch (err) {
        return reply.send({ plan: 'free', status: 'active' });
      }
    },
  });
}
