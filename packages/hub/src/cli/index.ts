import { Command } from 'commander';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { startCommand } from './start.js';
import { scanCommand } from './scan.js';
import { listCommand } from './list.js';
import { devCommand } from './dev.js';
import { stopCommand } from './stop.js';
import { statusCommand } from './status.js';
import { configCommand } from './config.js';
import { setOutputMode } from './utils/output.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read version from package.json
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

program
  .name('hub')
  .description('Addfox Hub - Browser extension development manager')
  .version(pkg.version)
  .option('--json', 'Output in JSON format')
  .option('--silent', 'Silent mode')
  .option('--config-dir <path>', 'Config directory', '~/.addfox-hub')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.json) setOutputMode('json');
    if (opts.silent) setOutputMode('silent');
  });

// hub (default) - same as hub start
program
  .command('start', { isDefault: true })
  .description('Start Hub server and dashboard')
  .option('-p, --port <port>', 'Server port', parseInt)
  .option('-h, --host <host>', 'Server host')
  .option('--cli', 'Start in CLI mode only (no browser)')
  .option('--no-open', 'Do not open browser automatically')
  .action(startCommand);

// hub scan
program
  .command('scan')
  .description('Scan for extension projects')
  .option('-p, --path <path>', 'Scan specific path')
  .option('-a, --add <path>', 'Add path to scan list')
  .option('-r, --remove <path>', 'Remove path from scan list')
  .option('-w, --add-workspace <path>', 'Add pnpm workspace path')
  .option('-l, --list', 'List scan configuration')
  .action(scanCommand);

// hub list
program
  .command('list')
  .alias('ls')
  .description('List projects or sessions')
  .option('-s, --sessions', 'List sessions instead of projects')
  .option('-t, --tool <tool>', 'Filter by tool (addfox, wxt, plasmo, vanilla)')
  .action(listCommand);

// hub dev
program
  .command('dev <project>')
  .description('Start development session for a project')
  .option('-b, --browser <browser>', 'Browser to use (chrome, edge, brave)')
  .option('--no-launch', 'Do not launch browser')
  .option('--headless', 'Run browser in headless mode')
  .option('-d, --detach', 'Run in detached mode')
  .action(devCommand);

// hub stop
program
  .command('stop [session]')
  .description('Stop a development session')
  .option('-p, --project <id>', 'Stop all sessions for a project')
  .option('-a, --all', 'Stop all sessions')
  .action(stopCommand);

// hub status
program
  .command('status')
  .description('Show Hub status')
  .option('-w, --watch', 'Watch mode')
  .action(statusCommand);

// hub config
program
  .command('config')
  .description('Manage Hub configuration')
  .argument('[action]', 'Action: list, get, set, path')
  .argument('[key]', 'Configuration key')
  .argument('[value]', 'Configuration value')
  .action((action, key, value) => {
    return configCommand(action, key, value);
  });

export async function runCLI(argv: string[]): Promise<void> {
  await program.parseAsync(argv);
}
