import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import type { ExtensionTool } from '../types.js';

export type PackageManager = 'npm' | 'pnpm' | 'yarn';

export function detectPackageManager(projectPath: string): PackageManager {
  if (existsSync(resolve(projectPath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(resolve(projectPath, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

function readPackageJson(projectPath: string): any | undefined {
  const pkgPath = resolve(projectPath, 'package.json');
  if (!existsSync(pkgPath)) return undefined;
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf-8'));
  } catch {
    return undefined;
  }
}

function formatRunCommand(pm: PackageManager, script: string): string {
  if (pm === 'yarn') {
    return `yarn ${script}`;
  }
  return `${pm} run ${script}`;
}

export function resolveDevCommand(
  projectPath: string,
  tool: ExtensionTool,
  customCommand?: string
): string {
  if (customCommand) return customCommand;

  const pkg = readPackageJson(projectPath);
  const pm = detectPackageManager(projectPath);

  if (pkg?.scripts?.dev) {
    return formatRunCommand(pm, 'dev');
  }

  switch (tool) {
    case 'addfox':
      return 'npx addfox dev';
    case 'wxt':
      return 'npx wxt dev';
    case 'plasmo':
      return 'npx plasmo dev';
    case 'generic':
    case 'vanilla':
    default:
      return '';
  }
}

export function resolveBuildCommand(
  projectPath: string,
  tool: ExtensionTool,
  customCommand?: string
): string {
  if (customCommand) return customCommand;

  const pkg = readPackageJson(projectPath);
  const pm = detectPackageManager(projectPath);

  if (pkg?.scripts?.build) {
    return formatRunCommand(pm, 'build');
  }

  switch (tool) {
    case 'addfox':
      return 'npx addfox build';
    case 'wxt':
      return 'npx wxt build';
    case 'plasmo':
      return 'npx plasmo build';
    case 'generic':
    case 'vanilla':
    default:
      return '';
  }
}
