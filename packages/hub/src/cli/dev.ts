import { resolve } from 'path';
import { randomBytes } from 'crypto';
import { getDB } from '../core/db.js';
import { detectAdapter } from '../core/adapters/index.js';
import { BrowserManager } from '../core/browser.js';
import { scanProject } from '../core/scanner.js';
import { log, success, info } from './utils/output.js';
import { startSpinner, stopSpinner } from './utils/spinner.js';
import { HubError, wrapHandler } from './utils/errors.js';
import type { Session, BrowserType } from '../types.js';

export const devCommand = wrapHandler(async (projectRef: string, options: {
  browser?: string;
  noLaunch?: boolean;
  headless?: boolean;
  detach?: boolean;
}) => {
  const db = getDB();
  await db.init();

  // Resolve project
  let project = db.getProjectById(projectRef) || db.getProjectByPath(resolve(projectRef));
  
  // If not found and it's a path, try to scan it
  if (!project && projectRef.startsWith('.')) {
    const path = resolve(projectRef);
    startSpinner(`Scanning ${path}...`);
    const scanned = await scanProject(path);
    stopSpinner(true, scanned ? 'Project found' : 'No project found');
    
    if (scanned) {
      project = scanned;
      await db.addProject(project);
      await db.addManualProject(path);
    }
  }

  if (!project) {
    throw new HubError(`Project not found: ${projectRef}`, 'PROJECT_NOT_FOUND');
  }

  // Check for existing session
  const existingSessions = db.getSessionsByProject(project.id).filter(s => 
    s.status === 'running' || s.status === 'starting'
  );
  
  if (existingSessions.length > 0) {
    info(`Project is already running (session: ${existingSessions[0].id})`);
    info(`Use "hub logs ${existingSessions[0].id}" to view logs`);
    return;
  }

  const browser = (options.browser || db.settings.defaultBrowser) as BrowserType;
  
  // Get adapter
  const adapter = await detectAdapter(project.path);
  if (!adapter) {
    throw new HubError(`Could not detect tool for project: ${project.tool}`, 'ADAPTER_NOT_FOUND');
  }

  // Create session
  const sessionId = randomBytes(8).toString('hex');
  const session: Session = {
    id: sessionId,
    projectId: project.id,
    projectName: project.name,
    browser,
    status: 'starting',
    startedAt: new Date().toISOString(),
    logs: [],
    errors: [],
  };

  await db.addSession(session);

  try {
    // Start dev server
    startSpinner('Starting dev server...');
    await db.updateSession(sessionId, { status: 'building' });
    
    const devHandle = await adapter.startDev(project.path, {
      browser,
      headless: options.headless,
    });

    await db.updateSession(sessionId, {
      status: 'running',
      buildPid: devHandle.pid,
      buildOutputPath: devHandle.outputPath,
      serverUrl: devHandle.serverUrl,
    });

    stopSpinner(true, 'Dev server started');

    // Launch browser if not disabled
    if (!options.noLaunch) {
      startSpinner('Launching browser...');
      
      const browserManager = new BrowserManager(db);
      const userDataDir = await browserManager.createUserDataDir(sessionId);
      
      const instance = await browserManager.launch(sessionId, {
        browser,
        extensionPath: devHandle.outputPath,
        userDataDir,
        headless: options.headless,
      });

      await db.updateSession(sessionId, {
        pid: instance.pid,
        debuggingPort: instance.debuggingPort,
        userDataDir,
        outputPath: devHandle.outputPath,
      });

      stopSpinner(true, `${browser} launched`);
    }

    // Update project stats
    await db.updateProject(project.id, {
      lastDevAt: new Date().toISOString(),
      devSessionCount: project.devSessionCount + 1,
    });

    success(`Development session started: ${sessionId}`);
    log('');
    log(`Project: ${project.name}`);
    log(`Browser: ${browser}`);
    if (devHandle.serverUrl) {
      log(`Dev URL: ${devHandle.serverUrl}`);
    }
    log('');
    log(`Commands:`);
    log(`  hub stop ${sessionId}     Stop session`);
    log(`  hub status              View all sessions`);

    // If not detached, keep process running
    if (!options.detach) {
      process.on('SIGINT', async () => {
        info('\nStopping session...');
        await devHandle.close();
        await db.updateSession(sessionId, { status: 'stopped', stoppedAt: new Date().toISOString() });
        process.exit(0);
      });
      
      // Keep process alive
      await new Promise(() => {});
    }

  } catch (err) {
    await db.updateSession(sessionId, { 
      status: 'error',
      stoppedAt: new Date().toISOString(),
    });
    throw err;
  }
});
