import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import staticPlugin from '@fastify/static';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { HubDB } from '../core/db.js';
import { registerRoutes } from './router.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ServerOptions {
  port: number;
  host: string;
  db: HubDB;
}

export async function startServer(options: ServerOptions) {
  const fastify = Fastify({
    logger: false,
  });

  // Register plugins
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  await fastify.register(websocket);

  // Static files (UI) - check if exists
  const uiPath = resolve(__dirname, '../dist-ui');
  const hasUI = existsSync(resolve(uiPath, 'index.html'));
  
  if (hasUI) {
    await fastify.register(staticPlugin, {
      root: uiPath,
      prefix: '/',
      wildcard: false,
    });
  }

  // API routes
  await registerRoutes(fastify, options.db);

  // SPA fallback (only if UI exists)
  if (hasUI) {
    fastify.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith('/api/')) {
        reply.code(404).send({ error: 'Not found' });
      } else {
        await reply.sendFile('index.html', uiPath);
      }
    });
  }

  await fastify.listen({
    port: options.port,
    host: options.host,
  });

  return {
    close: () => fastify.close(),
    url: `http://${options.host}:${options.port}`,
  };
}

// Export for CLI use
export { registerRoutes };
