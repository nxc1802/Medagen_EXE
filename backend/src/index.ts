import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env.js';
import { swaggerOptions, swaggerUiOptions } from './config/swagger.js';
// Make sure you import or implement routes later.
// import { registerRoutes } from './api/routes.js';

const fastify = Fastify({ logger: true });

async function start() {
  try {
    await fastify.register(cors, { origin: true });
    await fastify.register(websocket);
    await fastify.register(swagger as any, swaggerOptions);
    await fastify.register(swaggerUi, swaggerUiOptions);

    fastify.get('/health', async () => {
      return { status: 'ok', environment: env.NODE_ENV, llm_provider: env.LLM_PROVIDER };
    });

    // TODO: Register your actual API routes here once migrated
    // await registerRoutes(fastify);

    await fastify.listen({ port: env.PORT, host: env.HOST });
    fastify.log.info(`Server listening on http://${env.HOST}:${env.PORT}`);
    fastify.log.info(`Swagger Docs on http://${env.HOST}:${env.PORT}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
