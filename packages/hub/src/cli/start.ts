import open from 'open';
import { getDB } from '../core/db.js';
import { startServer } from '../server/index.js';
import { log, success, info, warn, error } from './utils/output.js';
import { wrapHandler } from './utils/errors.js';

export const startCommand = wrapHandler(async (options: {
  port?: number;
  host?: string;
  cli?: boolean;
  open?: boolean;
  json?: boolean;
}) => {
  const db = getDB();
  await db.init();

  const port = options.port || db.settings.serverPort;
  const host = options.host || db.settings.serverHost;
  const serverUrl = `http://${host}:${port}`;

  try {
    const server = await startServer({
      port,
      host,
      db,
    });

    if (!options.json) {
      success(`Hub Server started at ${serverUrl}`);
    }

    // Open browser unless disabled
    const shouldOpen = options.open !== false && !options.cli && db.settings.autoOpenBrowser;
    if (shouldOpen) {
      try {
        await open(serverUrl);
        if (!options.json) {
          info('Opening dashboard in browser...');
        }
      } catch {
        warn('Could not open browser automatically');
        log(`Please open: ${serverUrl}`);
      }
    }

    if (options.json) {
      console.log(JSON.stringify({
        status: 'running',
        url: serverUrl,
        port,
        host,
      }));
    }

    // Keep process running
    if (!options.json) {
      log('');
      log('Press Ctrl+C to stop');
      log('');
    }

    // Graceful shutdown
    process.on('SIGINT', async () => {
      if (!options.json) {
        log('\nShutting down...');
      }
      await server.close();
      process.exit(0);
    });

  } catch (err: any) {
    if (err.code === 'EADDRINUSE') {
      error(`Port ${port} is already in use. Is Hub already running?`);
      error(`Try: hub start --port ${port + 1}`);
    }
    throw err;
  }
});
