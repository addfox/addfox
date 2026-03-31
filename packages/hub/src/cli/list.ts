import { getDB } from '../core/db.js';
import { setOutputMode, info, formatProjectsAsTable, formatSessionsAsTable, formatJSON } from './utils/output.js';
import { wrapHandler } from './utils/errors.js';

export const listCommand = wrapHandler(async (options: {
  sessions?: boolean;
  tool?: string;
  json?: boolean;
}) => {
  setOutputMode(options.json ? 'json' : 'pretty');
  
  const db = getDB();
  await db.init();

  if (options.sessions) {
    const sessions = db.sessions;
    
    if (!options.json) {
      if (sessions.length === 0) {
        info('No sessions found.');
      } else {
        formatSessionsAsTable(sessions);
      }
    } else {
      formatJSON(sessions);
    }
    return;
  }

  let projects = db.projects;
  
  if (options.tool) {
    projects = projects.filter(p => p.tool === options.tool);
  }

  if (!options.json) {
    if (projects.length === 0) {
      info('No projects found. Run "hub scan" to discover projects.');
    } else {
      formatProjectsAsTable(projects);
    }
  } else {
    formatJSON(projects);
  }
});
