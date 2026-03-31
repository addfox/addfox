import chalk from 'chalk';
import type { CliOutputMode, Project, Session } from '../../types.js';

let outputMode: CliOutputMode = 'pretty';

export function setOutputMode(mode: CliOutputMode): void {
  outputMode = mode;
}

export function getOutputMode(): CliOutputMode {
  return outputMode;
}

export function log(message: string): void {
  if (outputMode === 'silent') return;
  if (outputMode === 'json') return;
  console.log(message);
}

export function logJSON(data: any): void {
  console.log(JSON.stringify(data, null, 2));
}

export function success(message: string): void {
  if (outputMode === 'silent') return;
  if (outputMode === 'json') return;
  console.log(chalk.green('✓'), message);
}

export function error(message: string): void {
  if (outputMode === 'silent') return;
  if (outputMode === 'json') {
    console.log(JSON.stringify({ error: message }));
    return;
  }
  console.error(chalk.red('✗'), message);
}

export function warn(message: string): void {
  if (outputMode === 'silent') return;
  if (outputMode === 'json') return;
  console.warn(chalk.yellow('⚠'), message);
}

export function info(message: string): void {
  if (outputMode === 'silent') return;
  if (outputMode === 'json') return;
  console.log(chalk.blue('ℹ'), message);
}

export function table(headers: string[], rows: string[][]): void {
  if (outputMode === 'silent' || outputMode === 'json') return;

  const colWidths = headers.map((h, i) => {
    const maxDataWidth = Math.max(...rows.map(r => (r[i] || '').length));
    return Math.max(h.length, maxDataWidth) + 2;
  });

  const headerRow = headers.map((h, i) => h.padEnd(colWidths[i])).join('');
  console.log(chalk.bold(headerRow));
  console.log(colWidths.map(w => '─'.repeat(w)).join(''));

  for (const row of rows) {
    const formattedRow = row.map((cell, i) => (cell || '').padEnd(colWidths[i])).join('');
    console.log(formattedRow);
  }
}

export function formatProjectsAsTable(projects: Project[]): void {
  if (projects.length === 0) {
    info('No projects found.');
    return;
  }

  const headers = ['ID', 'Name', 'Tool', 'Status', 'Path'];
  const rows = projects.map(p => [
    p.id.slice(0, 8),
    p.name.slice(0, 20),
    p.tool,
    p.lastDevAt ? 'Active' : 'Inactive',
    p.path.length > 40 ? '...' + p.path.slice(-37) : p.path,
  ]);

  table(headers, rows);
}

export function formatSessionsAsTable(sessions: Session[]): void {
  if (sessions.length === 0) {
    info('No active sessions.');
    return;
  }

  const headers = ['ID', 'Project', 'Browser', 'Status', 'Started'];
  const rows = sessions.map(s => [
    s.id.slice(0, 8),
    s.projectName.slice(0, 20),
    s.browser,
    s.status,
    new Date(s.startedAt).toLocaleTimeString(),
  ]);

  table(headers, rows);
}

export function formatJSON(data: any): void {
  console.log(JSON.stringify(data, null, 2));
}
