import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { WebSocketServer } from 'ws';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';
import type { Server } from 'node:http';
import { HubDB } from '../core/db.js';
import { registerRoutes } from './router.js';
import { getWebSocketManager } from './websocket.js';
import { createTerminalWebSocketServer } from './terminal-ws.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ServerOptions {
  port: number;
  host: string;
  db: HubDB;
}

export async function startServer(options: ServerOptions) {
  const app = new Hono();

  // CORS
  app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    credentials: true,
  }));

  // Initialize WebSocket manager
  getWebSocketManager();

  // API routes
  registerRoutes(app, options.db);

  // Static files (UI) - check if exists
  const uiPath = resolve(__dirname, '../dist-ui');
  const hasUI = existsSync(resolve(uiPath, 'index.html'));

  if (hasUI) {
    app.use('/*', serveStatic({ root: uiPath }));
  }

  // SPA fallback (only if UI exists)
  if (hasUI) {
    app.notFound((c) => {
      const path = c.req.path;
      if (path.startsWith('/api/')) {
        return c.json({ error: 'Not found' }, 404);
      }
      const indexPath = resolve(uiPath, 'index.html');
      if (existsSync(indexPath)) {
        return c.html(readFileSync(indexPath, 'utf-8'));
      }
      return c.json({ error: 'Not found' }, 404);
    });
  }

  const server = serve({
    fetch: app.fetch,
    port: options.port,
    hostname: options.host,
  }) as Server;

  // WebSocket endpoint for events
  const wss = new WebSocketServer({ noServer: true });
  wss.on('connection', (ws) => {
    getWebSocketManager().handleConnection(ws);
  });

  // 手动处理 events WebSocket 的 upgrade
  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url?.split('?')[0];
    
    if (pathname === '/api/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  // WebSocket endpoint for terminal
  createTerminalWebSocketServer(server);

  console.log(`Server listening on http://${options.host}:${options.port}`);
  if (hasUI) {
    console.log(`WebSocket endpoint: ws://${options.host}:${options.port}/api/ws`);
    console.log(`Terminal endpoint: ws://${options.host}:${options.port}/api/terminal`);
  }

  return {
    close: async () => {
      wss.close();
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
    url: `http://${options.host}:${options.port}`,
  };
}

// Export for CLI use
export { registerRoutes };
