import { getDB } from '../core/db.js';
import { BrowserManager } from '../core/browser.js';
import { setOutputMode, success, info, warn, formatJSON } from './utils/output.js';
import { wrapHandler } from './utils/errors.js';
import { HubError } from './utils/errors.js';

export const stopCommand = wrapHandler(async (sessionId: string, options: {
  project?: string;
  all?: boolean;
  json?: boolean;
}) => {
  setOutputMode(options.json ? 'json' : 'pretty');
  
  const db = getDB();
  await db.init();

  const sessionsToStop: string[] = [];

  if (options.all) {
    const activeSessions = db.sessions.filter(s => 
      s.status === 'running' || s.status === 'starting' || s.status === 'building'
    );
    sessionsToStop.push(...activeSessions.map(s => s.id));
  } else if (options.project) {
    const projectSessions = db.getSessionsByProject(options.project).filter(s => 
      s.status === 'running' || s.status === 'starting'
    );
    sessionsToStop.push(...projectSessions.map(s => s.id));
  } else if (sessionId) {
    sessionsToStop.push(sessionId);
  } else {
    throw new HubError('Please specify session ID, --project, or --all', 'MISSING_ARGUMENT');
  }

  if (sessionsToStop.length === 0) {
    if (!options.json) {
      info('No active sessions to stop.');
    } else {
      formatJSON({ stopped: [], message: 'No active sessions' });
    }
    return;
  }

  const browserManager = new BrowserManager(db);
  const stopped: string[] = [];

  for (const id of sessionsToStop) {
    const session = db.getSessionById(id);
    if (!session) {
      warn(`Session not found: ${id}`);
      continue;
    }

    try {
      // Stop browser
      await browserManager.stop(id);
      
      // Update session status
      await db.updateSession(id, {
        status: 'stopped',
        stoppedAt: new Date().toISOString(),
      });

      stopped.push(id);
      
      if (!options.json) {
        success(`Stopped session: ${id}`);
      }
    } catch (err) {
      warn(`Failed to stop session ${id}: ${err}`);
    }
  }

  if (options.json) {
    formatJSON({ stopped });
  }
});
