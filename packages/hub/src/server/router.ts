import { Hono } from 'hono';
import { HubDB } from '../core/db.js';
import { detectAdapter, getAdapter } from '../core/adapters/index.js';
import { resolveDevCommand, resolveBuildCommand } from '../core/command-resolver.js';
import { scanProject, quickScan, scanPaths } from '../core/scanner.js';
import { parsePnpmWorkspace, detectPnpmWorkspaceProjects } from '../core/workspace.js';
import { getEventBus } from '../core/event-bus.js';
import { getCDPManager } from '../core/cdp-manager.js';
import { BrowserManager } from '../core/browser.js';
import { randomBytes } from 'crypto';
import { resolve } from 'path';
import { existsSync } from 'fs';
import type { Session, CreateSessionRequest, ScanRequest, AddProjectRequest } from '../types.js';

export function registerRoutes(app: Hono, db: HubDB) {
  const eventBus = getEventBus();
  
  // Health check
  app.get('/api/health', async (c) => c.json({ 
    status: 'ok',
    websocket: 0,
  }));

  // Stats
  app.get('/api/stats', async (c) => c.json(db.getStats()));

  // ===== Projects =====

  // List projects
  app.get('/api/projects', async (c) => {
    const tool = c.req.query('tool');
    const page = c.req.query('page') || '1';
    const limit = c.req.query('limit') || '50';
    let projects = db.projects;
    
    if (tool) {
      projects = projects.filter(p => p.tool === tool);
    }
    
    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100);
    const start = (pageNum - 1) * limitNum;
    const end = start + limitNum;
    
    return c.json({
      projects: projects.slice(start, end),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: projects.length,
        totalPages: Math.ceil(projects.length / limitNum),
      },
    });
  });

  // Get project
  app.get('/api/projects/:id', async (c) => {
    const id = c.req.param('id');
    const project = db.getProjectById(id);
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    return c.json(project);
  });

  // Get project sessions
  app.get('/api/projects/:id/sessions', async (c) => {
    const id = c.req.param('id');
    const project = db.getProjectById(id);
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }
    return c.json(db.getSessionsByProject(id));
  });

  // Get project dev command info
  app.get('/api/projects/:id/dev-info', async (c) => {
    const id = c.req.param('id');
    const project = db.getProjectById(id);
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const adapter = await detectAdapter(project.path);
    const pkg = project.packageJson;

    return c.json({
      tool: project.tool,
      adapter: adapter?.name || 'none',
      devCommand: project.devCommand,
      buildCommand: project.buildCommand,
      resolvedDevCommand: resolveDevCommand(project.path, project.tool, project.devCommand),
      resolvedBuildCommand: resolveBuildCommand(project.path, project.tool, project.buildCommand),
      commandSource: project.devCommand ? 'custom' : 'auto',
      hasPackageJson: !!pkg,
      scripts: pkg?.scripts ? Object.keys(pkg.scripts) : [],
    });
  });

  // Update project commands
  app.patch('/api/projects/:id/commands', async (c) => {
    const id = c.req.param('id');
    const project = db.getProjectById(id);
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const body = await c.req.json() as { devCommand?: string; buildCommand?: string };
    await db.updateProject(id, {
      devCommand: body.devCommand,
      buildCommand: body.buildCommand,
    });

    return c.json({
      success: true,
      devCommand: body.devCommand,
      buildCommand: body.buildCommand,
      resolvedDevCommand: resolveDevCommand(project.path, project.tool, body.devCommand),
      resolvedBuildCommand: resolveBuildCommand(project.path, project.tool, body.buildCommand),
    });
  });

  // Add project
  app.post('/api/projects', async (c) => {
    const body = await c.req.json() as AddProjectRequest;
    const path = resolve(body.path);

    // Deduplication: return existing project if path already exists
    const existing = db.getProjectByPath(path);
    if (existing) {
      return c.json(existing, 200);
    }

    const project = await scanProject(path, 'manual');
    if (!project) {
      return c.json({ error: 'No extension project found at path' }, 400);
    }

    if (body.name) project.name = body.name;
    if (body.tags) project.tags = body.tags;

    await db.addManualProject(path);
    await db.addProject(project);

    return c.json(project, 201);
  });

  // Delete project
  app.delete('/api/projects/:id', async (c) => {
    const id = c.req.param('id');
    
    // Stop any active sessions first
    const sessions = db.getSessionsByProject(id);
    for (const session of sessions) {
      if (session.status === 'running' || session.status === 'building') {
        await db.updateSession(session.id, {
          status: 'stopped',
          stoppedAt: new Date().toISOString(),
        });
      }
    }
    
    await db.removeProject(id);
    return c.json({ success: true });
  });

  // Refresh project
  app.post('/api/projects/:id/refresh', async (c) => {
    const id = c.req.param('id');
    const project = db.getProjectById(id);
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const refreshed = await scanProject(project.path);
    if (refreshed) {
      await db.addProject({ ...refreshed, id, source: project.source }, { refresh: true });
      return c.json(refreshed);
    }

    return c.json({ error: 'Could not refresh project' }, 400);
  });

  // ===== Scan =====

  // Scan for projects
  app.post('/api/scan', async (c) => {
    const body = await c.req.json() as ScanRequest;

    if (body.path) {
      const result = await scanPaths({ paths: [resolve(body.path)], maxDepth: 1, source: 'scan' });
      for (const project of result.projects) {
        await db.addProject(project);
      }
      return c.json(result);
    }

    // Full scan
    const result = await scanPaths({ paths: db.settings.scan.paths, maxDepth: 1, source: 'scan' });
    for (const project of result.projects) {
      await db.addProject(project);
    }
    return c.json(result);
  });

  // Scan workspace
  app.post('/api/scan/workspace', async (c) => {
    const { path } = await c.req.json() as { path: string };
    const resolvedPath = resolve(path);
    
    const workspace = parsePnpmWorkspace(resolvedPath);
    if (!workspace) {
      return c.json({ error: 'No pnpm-workspace.yaml found' }, 400);
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

    return c.json({ projects: scanned, total: projects.length });
  });

  // ===== Sessions =====

  // List sessions
  app.get('/api/sessions', async (c) => {
    const status = c.req.query('status');
    let sessions = db.sessions;
    
    if (status) {
      sessions = sessions.filter(s => s.status === status);
    }
    
    return c.json(sessions);
  });

  // Get session
  app.get('/api/sessions/:id', async (c) => {
    const id = c.req.param('id');
    const session = db.getSessionById(id);
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }
    return c.json(session);
  });

  // Get session logs
  app.get('/api/sessions/:id/logs', async (c) => {
    const id = c.req.param('id');
    const limit = c.req.query('limit') || '100';
    const offset = c.req.query('offset') || '0';
    
    const session = db.getSessionById(id);
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }
    
    const limitNum = Math.min(parseInt(limit, 10), 1000);
    const offsetNum = parseInt(offset, 10);
    const logs = session.logs.slice(-limitNum - offsetNum, -offsetNum || undefined);
    
    return c.json({
      logs,
      total: session.logs.length,
      limit: limitNum,
      offset: offsetNum,
    });
  });

  // Create session
  app.post('/api/sessions', async (c) => {
    const body = await c.req.json() as CreateSessionRequest;
    const project = db.getProjectById(body.projectId);
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Detect adapter or use generic approach
    let adapter = await detectAdapter(project.path);
    
    // Resolve dev command (custom or auto-detected)
    const devCommand = resolveDevCommand(project.path, project.tool, project.devCommand);
    
    // If no specific adapter found but we have a dev command, use generic adapter
    if (!adapter && devCommand) {
      adapter = getAdapter('generic');
    }

    if (!adapter) {
      return c.json({ 
        error: 'Could not detect project tool',
        message: 'No framework detected and no dev script found in package.json'
      }, 400);
    }

    const sessionId = randomBytes(8).toString('hex');
    
    // 判断是否需要自动启动浏览器
    // 只有原生项目 (vanilla/generic) 才自动启动浏览器
    // 框架项目 (addfox/wxt/plasmo) 由框架自己处理浏览器启动
    const shouldAutoLaunchBrowser = project.tool === 'vanilla' || project.tool === 'generic';
    
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

    // Start dev in background with better error handling
    // 对于框架项目，设置 noLaunch: true，让框架自己处理浏览器
    const sessionOptions = { 
      ...body, 
      devCommand,
      noLaunch: !shouldAutoLaunchBrowser || body.noLaunch 
    };
    startDevSession(session, project, adapter, sessionOptions, db).catch(async (error) => {
      console.error(`Session ${sessionId} failed:`, error);
      await db.addLog(sessionId, {
        id: randomBytes(8).toString('hex'),
        timestamp: new Date().toISOString(),
        level: 'error',
        source: 'system',
        message: `Session failed: ${error.message}`,
        details: error.stack,
      });
      await db.updateSession(sessionId, {
        status: 'error',
        stoppedAt: new Date().toISOString(),
      });
    });

    return c.json(session, 201);
  });

  // Build project
  app.post('/api/projects/:id/build', async (c) => {
    const id = c.req.param('id');
    const project = db.getProjectById(id);
    
    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const adapter = await detectAdapter(project.path) || getAdapter('generic');
    if (!adapter) {
      return c.json({ error: 'Could not detect project tool' }, 400);
    }

    const buildCommand = resolveBuildCommand(project.path, project.tool, project.buildCommand);
    if (!buildCommand) {
      return c.json({ error: 'No build command available for this project' }, 400);
    }

    const result = await adapter.build(project.path, {
      target: 'chromium',
      command: buildCommand,
    });

    if (result.success) {
      await db.updateProject(id, { buildCount: project.buildCount + 1 });
    }

    return c.json(result);
  });

  // Stop session
  app.delete('/api/sessions/:id', async (c) => {
    const id = c.req.param('id');
    const session = db.getSessionById(id);
    
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }
    
    await db.updateSession(id, {
      status: 'stopping',
    });
    
    // TODO: Actually stop the process if we have a reference to it
    // This requires process manager integration
    
    await db.updateSession(id, {
      status: 'stopped',
      stoppedAt: new Date().toISOString(),
    });
    
    return c.json({ success: true });
  });

  // Delete session (remove from database)
  app.delete('/api/sessions/:id/permanent', async (c) => {
    const id = c.req.param('id');
    const session = db.getSessionById(id);
    
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }
    
    await db.removeSession(id);
    
    return c.json({ success: true });
  });

  // ===== Settings =====

  // Get settings
  app.get('/api/settings', async (c) => c.json(db.settings));

  // Update settings
  app.patch('/api/settings', async (c) => {
    const updates = await c.req.json() as Partial<typeof db.settings>;
    await db.updateSettings(updates);
    return c.json(db.settings);
  });

  // Get scan paths
  app.get('/api/settings/scan-paths', async (c) => c.json({
    paths: db.settings.scan.paths,
  }));

  // Add scan path
  app.post('/api/settings/scan-paths', async (c) => {
    const { path } = await c.req.json() as { path: string };
    const resolvedPath = resolve(path);
    
    if (!existsSync(resolvedPath)) {
      return c.json({ error: 'Path does not exist' }, 400);
    }

    await db.addScanPath(resolvedPath);
    return c.json({ success: true, path: resolvedPath });
  });

  // Delete scan path
  app.delete('/api/settings/scan-paths', async (c) => {
    const { path } = await c.req.json() as { path: string };
    await db.removeScanPath(path);
    return c.json({ success: true });
  });

  // Trigger scan for a specific path
  app.post('/api/settings/scan-paths/scan', async (c) => {
    const { path } = await c.req.json() as { path?: string };

    const pathsToScan = path ? [resolve(path)] : db.settings.scan.paths;
    const result = await scanPaths({ paths: pathsToScan, maxDepth: db.settings.scan.maxDepth, source: 'scan' });

    for (const project of result.projects) {
      await db.addProject(project, { refresh: true });
    }

    return c.json({
      success: true,
      scanned: result.scanned,
      found: result.projects.length,
      errors: result.errors,
    });
  });

  // ===== CDP (Chrome DevTools Protocol) =====
  const cdpManager = getCDPManager();

  // Get CDP targets for a session
  app.get('/api/sessions/:id/cdp/targets', async (c) => {
    const id = c.req.param('id');
    const session = db.getSessionById(id);
    
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (!session.debuggingPort) {
      return c.json({ error: 'Session has no debugging port' }, 400);
    }

    try {
      const targets = await cdpManager.getTargets(session.debuggingPort);
      return c.json({ targets });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // Connect to CDP
  app.post('/api/sessions/:id/cdp/connect', async (c) => {
    const id = c.req.param('id');
    const { targetId } = await c.req.json() as { targetId?: string };
    const session = db.getSessionById(id);
    
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (!session.debuggingPort) {
      return c.json({ error: 'Session has no debugging port' }, 400);
    }

    try {
      cdpManager.registerSession(id, session.debuggingPort, session.browser);
      const connected = await cdpManager.connect(id, targetId);
      return c.json({ connected });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // Disconnect from CDP
  app.post('/api/sessions/:id/cdp/disconnect', async (c) => {
    const id = c.req.param('id');
    cdpManager.disconnect(id);
    return c.json({ success: true });
  });

  // Execute script via CDP
  app.post('/api/sessions/:id/cdp/evaluate', async (c) => {
    const id = c.req.param('id');
    const { expression } = await c.req.json() as { expression: string };
    
    if (!cdpManager.isConnected(id)) {
      return c.json({ error: 'Not connected to CDP' }, 400);
    }

    try {
      const result = await cdpManager.evaluate(id, expression);
      return c.json({ result });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // Reload page
  app.post('/api/sessions/:id/cdp/reload', async (c) => {
    const id = c.req.param('id');
    const { ignoreCache = false } = await c.req.json() as { ignoreCache?: boolean };
    
    if (!cdpManager.isConnected(id)) {
      return c.json({ error: 'Not connected to CDP' }, 400);
    }

    try {
      await cdpManager.reload(id, ignoreCache);
      return c.json({ success: true });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });

  // Take screenshot
  app.get('/api/sessions/:id/cdp/screenshot', async (c) => {
    const id = c.req.param('id');
    
    if (!cdpManager.isConnected(id)) {
      return c.json({ error: 'Not connected to CDP' }, 400);
    }

    try {
      const data = await cdpManager.takeScreenshot(id);
      if (!data) {
        return c.json({ error: 'Failed to take screenshot' }, 500);
      }
      c.header('Content-Type', 'image/png');
      return c.body(Buffer.from(data, 'base64'));
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  });
}

// Helper function to start dev session in background
async function startDevSession(
  session: Session,
  project: { id: string; path: string; name: string; tool: string },
  adapter: any,
  options: CreateSessionRequest,
  db: HubDB
) {
  const eventBus = getEventBus();
  const browserManager = new BrowserManager(db);
  
  // Add initial log
  await db.addLog(session.id, {
    id: randomBytes(8).toString('hex'),
    timestamp: new Date().toISOString(),
    level: 'info',
    source: 'system',
    message: `Starting development session...`,
    details: { 
      tool: project.tool,
      adapter: adapter.name,
      devCommand: options.devCommand || 'auto-detected'
    },
  });
  
  // Start dev server
  await db.updateSession(session.id, { status: 'building' });
  
  // Start the dev process using adapter
  const devHandle = await adapter.startDev(project.path, {
    browser: session.browser,
    headless: options.headless,
    command: options.devCommand,
    onProgress: (progress: number, message: string, stage?: 'init' | 'install' | 'build' | 'launch' | 'ready' | 'error') => {
      // Broadcast progress via event bus
      eventBus.emit('session:build-progress', {
        sessionId: session.id,
        progress,
        message,
        stage,
      });
    },
  });

  await db.updateSession(session.id, {
    status: 'running',
    buildPid: devHandle.pid,
    buildOutputPath: devHandle.outputPath,
    serverUrl: devHandle.serverUrl,
  });

  await db.addLog(session.id, {
    id: randomBytes(8).toString('hex'),
    timestamp: new Date().toISOString(),
    level: 'info',
    source: 'build',
    message: `Dev server started (PID: ${devHandle.pid})`,
    details: { outputPath: devHandle.outputPath, serverUrl: devHandle.serverUrl },
  });

  // Launch browser with extension (unless noLaunch is set)
  if (!options.noLaunch) {
    try {
      await db.addLog(session.id, {
        id: randomBytes(8).toString('hex'),
        timestamp: new Date().toISOString(),
        level: 'info',
        source: 'system',
        message: `Launching ${session.browser} browser with extension...`,
      });

      const browserInstance = await browserManager.launch(session.id, {
        browser: session.browser,
        extensionPath: devHandle.outputPath,
        headless: options.headless,
      });

      await db.updateSession(session.id, {
        pid: browserInstance.pid,
        debuggingPort: browserInstance.debuggingPort,
        userDataDir: browserInstance.userDataDir,
      });

      await db.addLog(session.id, {
        id: randomBytes(8).toString('hex'),
        timestamp: new Date().toISOString(),
        level: 'info',
        source: 'system',
        message: `Browser launched (PID: ${browserInstance.pid}, debugging port: ${browserInstance.debuggingPort})`,
      });
    } catch (error: any) {
      await db.addLog(session.id, {
        id: randomBytes(8).toString('hex'),
        timestamp: new Date().toISOString(),
        level: 'warn',
        source: 'system',
        message: `Failed to launch browser: ${error.message}`,
        details: { error: error.stack },
      });
      // Don't fail the session if browser launch fails
    }
  }

  // Update project stats
  await db.updateProject(project.id, {
    lastDevAt: new Date().toISOString(),
    devSessionCount: (db.getProjectById(project.id)?.devSessionCount || 0) + 1,
  });

  // If there's a build complete callback, listen for it
  if (devHandle.onBuildComplete) {
    devHandle.onBuildComplete(async (result: any) => {
      await db.addLog(session.id, {
        id: randomBytes(8).toString('hex'),
        timestamp: new Date().toISOString(),
        level: result.success ? 'info' : 'error',
        source: 'build',
        message: result.success ? 'Build completed successfully' : 'Build failed',
        details: result,
      });
    });
  }

  // Handle process exit
  // Note: This is a simplified version. In production, you'd want to
  // store the process reference and monitor it properly
}
