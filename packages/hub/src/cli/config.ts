import { getDB } from '../core/db.js';
import { setOutputMode, info, log, success, formatJSON } from './utils/output.js';
import { wrapHandler } from './utils/errors.js';
import { HubError } from './utils/errors.js';

const VALID_KEYS = [
  'defaultBrowser',
  'serverPort',
  'serverHost',
  'autoOpenBrowser',
  'cliOutput',
  'maxLogHistory',
  'logLevel',
] as const;

type ValidKey = typeof VALID_KEYS[number];

export const configCommand = wrapHandler(async (action: string, key?: string, value?: string, options: {
  json?: boolean;
} = {}) => {
  setOutputMode(options.json ? 'json' : 'pretty');
  
  const db = getDB();
  await db.init();

  // Show all config
  if (!action || action === 'list') {
    const settings = db.settings;
    
    if (!options.json) {
      info('Hub Configuration:');
      console.log('');
      console.log('Browser:');
      console.log(`  defaultBrowser: ${settings.defaultBrowser}`);
      console.log('');
      console.log('Server:');
      console.log(`  serverPort: ${settings.serverPort}`);
      console.log(`  serverHost: ${settings.serverHost}`);
      console.log(`  autoOpenBrowser: ${settings.autoOpenBrowser}`);
      console.log('');
      console.log('CLI:');
      console.log(`  cliOutput: ${settings.cliOutput}`);
      console.log('');
      console.log('Logs:');
      console.log(`  maxLogHistory: ${settings.maxLogHistory}`);
      console.log(`  logLevel: ${settings.logLevel}`);
    } else {
      formatJSON(settings);
    }
    return;
  }

  if (action === 'get') {
    if (!key) {
      throw new HubError('Please specify a key', 'MISSING_ARGUMENT');
    }
    
    const settings = db.settings;
    const val = (settings as any)[key];
    
    if (!options.json) {
      log(String(val));
    } else {
      formatJSON({ [key]: val });
    }
    return;
  }

  if (action === 'set') {
    if (!key || value === undefined) {
      throw new HubError('Please specify key and value', 'MISSING_ARGUMENT');
    }

    if (!VALID_KEYS.includes(key as ValidKey)) {
      throw new HubError(`Invalid key: ${key}. Valid keys: ${VALID_KEYS.join(', ')}`, 'INVALID_KEY');
    }

    // Parse value
    let parsedValue: any = value;
    if (value === 'true') parsedValue = true;
    if (value === 'false') parsedValue = false;
    if (/^\d+$/.test(value)) parsedValue = parseInt(value, 10);

    await db.updateSettings({ [key]: parsedValue });
    success(`Set ${key} = ${parsedValue}`);
    return;
  }

  if (action === 'path') {
    const configDir = db.getConfigDir();
    if (!options.json) {
      log(configDir);
    } else {
      formatJSON({ configDir });
    }
    return;
  }

  throw new HubError(`Unknown action: ${action}`, 'UNKNOWN_ACTION');
});
