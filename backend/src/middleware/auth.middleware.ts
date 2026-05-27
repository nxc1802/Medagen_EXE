import type { FastifyRequest, FastifyReply } from 'fastify';
import { SupabaseService } from '../services/supabase.service.js';

const supabaseService = new SupabaseService();

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7);
  const user = await supabaseService.verifyToken(token);

  if (!user) {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }

  (request as any).user = user;
}
