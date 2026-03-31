import { getDB } from '../core/db.js';
import { setOutputMode, info, success, warn, formatProjectsAsTable, formatSessionsAsTable, formatJSON } from './utils/output.js';
import { wrapHandler } from './utils/errors.js';

export const statusCommand = wrapHandler(async (options: {
  watch?: boolean;
  json?: boolean;
}) => {
  setOutputMode(options.json ? 'json' : 'pretty');
  
  const db = getDB();
  await db.init();

  const stats = db.getStats();
  const activeSessions = db.activeSessions;

  if (!options.json) {
    console.log('');
    success('Hub Status');
    console.log('');
    console.log(`Projects:        ${stats.projects}`);
    console.log(`Active Sessions: ${activeSessions.length}`);
    console.log(`Total Sessions:  ${stats.totalSessions}`);
    console.log('');

    if (activeSessions.length > 0) {
      info('Active Sessions:');
      formatSessionsAsTable(activeSessions);
    }

    if (stats.projects > 0 && activeSessions.length === 0) {
      info('No active sessions. Use "hub dev <project>" to start developing.');
    }

    if (stats.projects === 0) {
      warn('No projects found. Use "hub scan" to discover projects.');
    }
  } else {
    formatJSON({
      stats,
      activeSessions,
      settings: {
        scanPaths: db.settings.scan.paths,
        defaultBrowser: db.settings.defaultBrowser,
      },
    });
  }
});
