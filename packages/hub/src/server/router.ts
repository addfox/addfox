import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from 'ws';
import { HubDB, getDB as getDatabase } from '../core/db.js';
import { detectAdapter } from '../core/adapters/index.js';
import { scanProject, quickScan } from '../core/scanner.js';
import { parsePnpmWorkspace, detectPnpmWorkspaceProjects } from '../core/workspace.js';
import { randomBytes } from 'crypto';
import { resolve } from 'path';
import type { Session, CreateSessionRequest, ScanRequest, AddProjectRequest } from '../types.js';

export async function registerRoutes(fastify: FastifyInstance, db: HubDB) {
  // Health check
  fastify.get('/api/health', async () => ({ status: 'ok' }));

  // Stats
  fastify.get('/api/stats', async () => db.getStats());

  // ===== Projects =====

  // List projects
  fastify.get('/api/projects', async (request) => {
    const { tool } = request.query as { tool?: string };
    let projects = db.projects;
    if (tool) {
      projects = projects.filter(p => p.tool === tool);
    }
    return projects;
  });

  // Get project
  fastify.get('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = db.getProjectById(id);
    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }
    return project;
  });

  // Add project
  fastify.post('/api/projects', async (request, reply) => {
    const body = request.body as AddProjectRequest;
    const path = resolve(body.path);
    
    const project = await scanProject(path);
    if (!project) {
      return reply.code(400).send({ error: 'No extension project found at path' });
    }

    if (body.name) project.name = body.name;
    if (body.tags) project.tags = body.tags;

    await db.addManualProject(path);
    await db.addProject(project);

    return reply.code(201).send(project);
  });

  // Delete project
  fastify.delete('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.removeProject(id);
    return { success: true };
  });

  // Refresh project
  fastify.post('/api/projects/:id/refresh', async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = db.getProjectById(id);
    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    const refreshed = await scanProject(project.path);
    if (refreshed) {
      await db.addProject({ ...refreshed, id });
      return refreshed;
    }

    return reply.code(400).send({ error: 'Could not refresh project' });
  });

  // ===== Scan =====

  // Scan for projects
  fastify.post('/api/scan', async (request) => {
    const body = request.body as ScanRequest;
    
    if (body.path) {
      const result = await quickScan([resolve(body.path)]);
      for (const project of result.projects) {
        await db.addProject(project);
      }
      return result;
    }

    // Full scan
    const result = await quickScan(db.settings.scan.paths);
    for (const project of result.projects) {
      await db.addProject(project);
    }
    return result;
  });

  // Scan workspace
  fastify.post('/api/scan/workspace', async (request, reply) => {
    const { path } = request.body as { path: string };
    const resolvedPath = resolve(path);
    
    const workspace = parsePnpmWorkspace(resolvedPath);
    if (!workspace) {
      return reply.code(400).send({ error: 'No pnpm-workspace.yaml found' });
    }

    const projects = await detectPnpmWorkspaceProjects(workspace);
    const scanned = [];
    
    for (const projectPath of projects) {
      const project = await scanProject(projectPath);
      if (project) {
        project.workspace = { root: resolvedPath, name: resolvedPath.split(/[/\\]/).pop() || '' };
        await db.addProject(project);
        scanned.push(project);
      }
    }

    await db.addWorkspacePath(resolvedPath);

    return { projects: scanned, total: projects.length };
  });

  // ===== Sessions =====

  // List sessions
  fastify.get('/api/sessions', async () => db.sessions);

  // Get session
  fastify.get('/api/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = db.getSessionById(id);
    if (!session) {
      return reply.code(404).send({ error: 'Session not found' });
    }
    return session;
  });

  // Get session logs
  fastify.get('/api/sessions/:id/logs', async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = db.getSessionById(id);
    if (!session) {
      return reply.code(404).send({ error: 'Session not found' });
    }
    return session.logs;
  });

  // Create session
  fastify.post('/api/sessions', async (request, reply) => {
    const body = request.body as CreateSessionRequest;
    const project = db.getProjectById(body.projectId);
    
    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }

    const adapter = await detectAdapter(project.path);
    if (!adapter) {
      return reply.code(400).send({ error: 'Could not detect project tool' });
    }

    const sessionId = randomBytes(8).toString('hex');
    const session: Session = {
      id: sessionId,
      projectId: project.id,
      projectName: project.name,
      browser: body.browser || db.settings.defaultBrowser,
      status: 'starting',
      startedAt: new Date().toISOString(),
      logs: [],
      errors: [],
    };

    await db.addSession(session);

    // Start dev in background
    startDevSession(session, project, adapter, body).catch(async () => {
      await db.updateSession(sessionId, {
        status: 'error',
        stoppedAt: new Date().toISOString(),
      });
    });

    return reply.code(201).send(session);
  });

  // Stop session
  fastify.delete('/api/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await db.updateSession(id, {
      status: 'stopped',
      stoppedAt: new Date().toISOString(),
    });
    return { success: true };
  });

  // ===== Settings =====

  // Get settings
  fastify.get('/api/settings', async () => db.settings);

  // Update settings
  fastify.patch('/api/settings', async (request, reply) => {
    const updates = request.body as Partial<typeof db.settings>;
    await db.updateSettings(updates);
    return db.settings;
  });

  // ===== WebSocket for real-time updates =====
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fastify.get('/api/ws', { websocket: true }, (connection: any) => {
    const socket = connection.socket as WebSocket;
    
    // Send initial data
    const dbInstance = getDatabase();
    socket.send(JSON.stringify({
      type: 'init',
      data: {
        stats: dbInstance.getStats(),
        sessions: dbInstance.activeSessions,
      },
    }));

    // Simple ping/pong
    socket.on('message', (message: Buffer | ArrayBuffer | Buffer[]) => {
      const data = JSON.parse(message.toString());
      if (data.type === 'ping') {
        socket.send(JSON.stringify({ type: 'pong' }));
      }
    });
  });
}

// Helper function to start dev session in background
async function startDevSession(
  session: Session,
  project: { id: string; path: string; name: string },
  adapter: any,
  options: CreateSessionRequest
) {
  const db = getDatabase();
  
  // Start dev server
  await db.updateSession(session.id, { status: 'building' });
  
  const devHandle = await adapter.startDev(project.path, {
    browser: session.browser,
  });

  await db.updateSession(session.id, {
    status: 'running',
    buildPid: devHandle.pid,
    buildOutputPath: devHandle.outputPath,
    serverUrl: devHandle.serverUrl,
  });

  // Update project stats
  await db.updateProject(project.id, {
    lastDevAt: new Date().toISOString(),
  });
}
