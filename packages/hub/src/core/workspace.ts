import { existsSync, readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { globby } from 'globby';
import YAML from 'yaml';
import type { PnpmWorkspace, DetectedWorkspace } from '../types.js';

/**
 * Parse pnpm-workspace.yaml file
 */
export function parsePnpmWorkspace(rootPath: string): PnpmWorkspace | null {
  const yamlPath = resolve(rootPath, 'pnpm-workspace.yaml');
  const ymlPath = resolve(rootPath, 'pnpm-workspace.yml');
  
  const configPath = existsSync(yamlPath) ? yamlPath : existsSync(ymlPath) ? ymlPath : null;
  
  if (!configPath) return null;

  try {
    const content = readFileSync(configPath, 'utf-8');
    const parsed = YAML.parse(content);
    
    return {
      root: rootPath,
      packages: parsed.packages || ['packages/*'],
    };
  } catch (error) {
    console.warn(`Failed to parse pnpm-workspace.yaml at ${rootPath}:`, error);
    return null;
  }
}

/**
 * Find pnpm-workspace.yaml in current or parent directories
 */
export function findPnpmWorkspace(startPath: string): PnpmWorkspace | null {
  let currentDir = resolve(startPath);
  const root = resolve('/');

  while (currentDir !== root) {
    const workspace = parsePnpmWorkspace(currentDir);
    if (workspace) return workspace;
    
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  return null;
}

/**
 * Detect all projects in a pnpm workspace
 */
export async function detectPnpmWorkspaceProjects(workspace: PnpmWorkspace): Promise<string[]> {
  const projects: string[] = [];

  for (const pattern of workspace.packages) {
    // Convert pnpm pattern to globby pattern
    // e.g., "packages/*" -> "packages/*/package.json"
    const globPattern = pattern.endsWith('/') 
      ? `${pattern}**/package.json`
      : `${pattern}/package.json`;
    
    try {
      const matches = await globby(globPattern, {
        cwd: workspace.root,
        absolute: true,
        onlyFiles: true,
        ignore: ['**/node_modules/**'],
      });

      for (const pkgPath of matches) {
        projects.push(dirname(pkgPath));
      }
    } catch (error) {
      console.warn(`Failed to scan pattern ${globPattern}:`, error);
    }
  }

  return [...new Set(projects)]; // Remove duplicates
}

/**
 * Detect all workspaces in a directory (recursively search for pnpm-workspace.yaml)
 */
export async function detectWorkspaces(rootPath: string): Promise<DetectedWorkspace[]> {
  const workspaces: DetectedWorkspace[] = [];
  const scannedRoots = new Set<string>();

  // First check if the root itself is a workspace
  const rootWorkspace = parsePnpmWorkspace(rootPath);
  if (rootWorkspace) {
    const projects = await detectPnpmWorkspaceProjects(rootWorkspace);
    workspaces.push({
      type: 'pnpm',
      root: rootPath,
      name: getWorkspaceName(rootPath),
      projects,
    });
    scannedRoots.add(rootPath);
  }

  // Search for nested workspaces
  try {
    const workspaceFiles = await globby('**/pnpm-workspace.yaml', {
      cwd: rootPath,
      absolute: true,
      onlyFiles: true,
      ignore: ['**/node_modules/**', '**/.git/**'],
      deep: 3,
    });

    for (const file of workspaceFiles) {
      const dir = dirname(file);
      if (scannedRoots.has(dir)) continue;

      const workspace = parsePnpmWorkspace(dir);
      if (workspace) {
        const projects = await detectPnpmWorkspaceProjects(workspace);
        workspaces.push({
          type: 'pnpm',
          root: dir,
          name: getWorkspaceName(dir),
          projects,
        });
        scannedRoots.add(dir);
      }
    }
  } catch (error) {
    console.warn('Failed to search for workspaces:', error);
  }

  return workspaces;
}

/**
 * Get a friendly name for a workspace
 */
function getWorkspaceName(workspacePath: string): string {
  const parts = workspacePath.split(/[/\\]/);
  return parts[parts.length - 1] || 'unnamed-workspace';
}

/**
 * Check if a path is inside a workspace
 */
export function isInsideWorkspace(projectPath: string, workspaceRoot: string): boolean {
  const normalizedProject = resolve(projectPath);
  const normalizedWorkspace = resolve(workspaceRoot);
  return normalizedProject.startsWith(normalizedWorkspace + '/') || 
         normalizedProject.startsWith(normalizedWorkspace + '\\');
}

/**
 * Get workspace info for a project
 */
export function getProjectWorkspace(
  projectPath: string,
  workspaces: DetectedWorkspace[]
): { root: string; name: string } | undefined {
  for (const ws of workspaces) {
    if (isInsideWorkspace(projectPath, ws.root)) {
      return { root: ws.root, name: ws.name };
    }
  }
  return undefined;
}
