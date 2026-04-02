import { existsSync, statSync, readFileSync } from 'fs';
import { resolve, basename } from 'path';
import { globby } from 'globby';
import { createHash } from 'crypto';
import type { ExtensionTool, Project, ExtensionManifest, HubSettings } from '../types.js';
import { detectWorkspaces, parsePnpmWorkspace, detectPnpmWorkspaceProjects } from './workspace.js';

const TOOL_PATTERNS: Record<ExtensionTool, { configFiles: string[]; dependencies: string[] }> = {
  addfox: {
    configFiles: ['addfox.config.ts', 'addfox.config.js', 'addfox.config.mjs', 'addfox.config.cjs'],
    dependencies: ['addfox', '@addfox/core', '@addfox/cli'],
  },
  wxt: {
    configFiles: ['wxt.config.ts', 'wxt.config.js', 'wxt.config.mjs'],
    dependencies: ['wxt'],
  },
  plasmo: {
    configFiles: ['plasmo.config.js', 'plasmo.config.ts', 'plasmo.config.mjs'],
    dependencies: ['plasmo'],
  },
  vanilla: {
    configFiles: [],
    dependencies: [],
  },
  generic: {
    configFiles: [],
    dependencies: [],
  },
  unknown: {
    configFiles: [],
    dependencies: [],
  },
};

export interface ScanOptions {
  paths?: string[];
  maxDepth?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  onProgress?: (current: number, total: number, path: string) => void;
}

export interface ScanResult {
  projects: Project[];
  scanned: number;
  errors: Array<{ path: string; error: string }>;
}

export function generateProjectId(path: string): string {
  return createHash('md5').update(resolve(path)).digest('hex').slice(0, 12);
}

function hasConfigFile(dir: string, files: string[]): boolean {
  return files.some(f => existsSync(resolve(dir, f)));
}

function readPackageJson(dir: string): any | undefined {
  const pkgPath = resolve(dir, 'package.json');
  if (!existsSync(pkgPath)) return undefined;
  
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf-8'));
  } catch {
    return undefined;
  }
}

function readManifest(dir: string): ExtensionManifest | undefined {
  const manifestPaths = [
    'app/manifest.json',
    'manifest.json',
    'public/manifest.json',
    '.output/manifest.json',
    '.plasmo/manifest.json',
    'dist/manifest.json',
  ];

  for (const manifestPath of manifestPaths) {
    const fullPath = resolve(dir, manifestPath);
    if (!existsSync(fullPath)) continue;

    try {
      const content = JSON.parse(readFileSync(fullPath, 'utf-8'));
      if (content.name && content.version && (content.manifest_version === 2 || content.manifest_version === 3)) {
        return content;
      }
    } catch {
      // Continue to next path
    }
  }

  return undefined;
}

function detectTool(dir: string, pkgJson?: any): ExtensionTool {
  // First check for framework config files (highest priority)
  for (const [tool, patterns] of Object.entries(TOOL_PATTERNS)) {
    if (tool === 'unknown' || tool === 'vanilla' || tool === 'generic') continue;
    if (hasConfigFile(dir, patterns.configFiles)) {
      return tool as ExtensionTool;
    }
  }

  // Check for framework dependencies
  if (pkgJson) {
    const allDeps = {
      ...pkgJson.dependencies,
      ...pkgJson.devDependencies,
    };

    for (const [tool, patterns] of Object.entries(TOOL_PATTERNS)) {
      if (tool === 'unknown' || tool === 'vanilla' || tool === 'generic') continue;
      if (patterns.dependencies.some(dep => allDeps[dep])) {
        return tool as ExtensionTool;
      }
    }
  }

  // Check for manifest.json - could be vanilla or generic
  if (readManifest(dir)) {
    // Check if it has a dev script - treat as generic if so
    if (pkgJson?.scripts?.dev || pkgJson?.scripts?.start) {
      return 'generic';
    }
    return 'vanilla';
  }

  return 'unknown';
}

export async function scanProject(dir: string, source?: 'scan' | 'manual'): Promise<Project | null> {
  const resolvedPath = resolve(dir);
  
  if (!existsSync(resolvedPath)) return null;
  
  const stat = statSync(resolvedPath);
  if (!stat.isDirectory()) return null;

  const pkgJson = readPackageJson(resolvedPath);
  const tool = detectTool(resolvedPath, pkgJson);
  
  if (tool === 'unknown') return null;

  const manifest = readManifest(resolvedPath);
  const name = manifest?.name || pkgJson?.name || basename(resolvedPath);

  return {
    id: generateProjectId(resolvedPath),
    name,
    path: resolvedPath,
    tool,
    manifest,
    packageJson: pkgJson,
    discoveredAt: new Date().toISOString(),
    lastModified: stat.mtime.toISOString(),
    buildCount: 0,
    devSessionCount: 0,
    source,
  };
}

export async function scanPaths(options: ScanOptions & { source?: 'scan' | 'manual' }): Promise<ScanResult> {
  const projects: Project[] = [];
  const errors: Array<{ path: string; error: string }> = [];
  let scanned = 0;

  const paths = options.paths || [];
  const maxDepth = options.maxDepth || 3;
  const excludePatterns = options.excludePatterns || ['**/node_modules/**', '**/.git/**'];
  const dirsToScan = new Set<string>();
  const source = options.source;

  for (const scanPath of paths) {
    const resolvedPath = resolve(scanPath);
    if (!existsSync(resolvedPath)) {
      errors.push({ path: scanPath, error: 'Path does not exist' });
      continue;
    }

    const pnpmWorkspace = parsePnpmWorkspace(resolvedPath);
    if (pnpmWorkspace) {
      const workspaceProjects = await detectPnpmWorkspaceProjects(pnpmWorkspace);
      for (const pkg of workspaceProjects) {
        dirsToScan.add(pkg);
      }
      continue;
    }

    const singleProject = await scanProject(resolvedPath, source);
    if (singleProject) {
      projects.push(singleProject);
      continue;
    }

    try {
      const patterns = [
        '**/addfox.config.{ts,js,mjs,cjs}',
        '**/wxt.config.{ts,js,mjs}',
        '**/plasmo.config.{js,ts,mjs}',
        '**/manifest.json',
      ];

      const matches = await globby(patterns, {
        cwd: resolvedPath,
        absolute: true,
        onlyFiles: true,
        ignore: excludePatterns,
        deep: maxDepth,
      });

      for (const match of matches) {
        const dir = resolve(match, '..');
        dirsToScan.add(dir);
      }
    } catch (error) {
      errors.push({ path: scanPath, error: String(error) });
    }
  }

  const uniqueDirs = Array.from(dirsToScan);
  const total = uniqueDirs.length;

  for (let i = 0; i < uniqueDirs.length; i++) {
    const dir = uniqueDirs[i];
    scanned++;

    options.onProgress?.(i + 1, total, dir);

    try {
      const project = await scanProject(dir);
      if (project) {
        const existing = projects.find(p => p.id === project.id);
        if (!existing) {
          projects.push(project);
        }
      }
    } catch (error) {
      errors.push({ path: dir, error: String(error) });
    }
  }

  return { projects, scanned, errors };
}

export async function fullScan(settings: HubSettings, onProgress?: (msg: string) => void): Promise<ScanResult> {
  const allProjects: Project[] = [];
  const errors: Array<{ path: string; error: string }> = [];
  let scanned = 0;

  onProgress?.(`Scanning ${settings.manualProjects.length} manual projects...`);
  if (settings.manualProjects.length > 0) {
    const manualResult = await scanPaths({
      paths: settings.manualProjects,
      maxDepth: 1,
      source: 'manual',
    });
    allProjects.push(...manualResult.projects);
    errors.push(...manualResult.errors);
    scanned += manualResult.scanned;
  }

  onProgress?.(`Scanning configured paths...`);
  const configuredPaths = settings.scan.paths.filter(p => 
    !settings.manualProjects.includes(p)
  );
  
  if (configuredPaths.length > 0) {
    const configResult = await scanPaths({
      paths: configuredPaths,
      maxDepth: settings.scan.maxDepth,
      excludePatterns: settings.scan.excludePatterns,
      source: 'scan',
    });
    
    for (const project of configResult.projects) {
      if (!allProjects.find(p => p.id === project.id)) {
        allProjects.push(project);
      }
    }
    errors.push(...configResult.errors);
    scanned += configResult.scanned;
  }

  onProgress?.(`Scanning workspace paths...`);
  for (const wsPath of settings.workspace.paths) {
    const workspace = parsePnpmWorkspace(wsPath);
    if (!workspace) {
      errors.push({ path: wsPath, error: 'Not a valid pnpm workspace' });
      continue;
    }

    onProgress?.(`Scanning workspace: ${wsPath}...`);
    const projects = await detectPnpmWorkspaceProjects(workspace);
    
    for (const projectPath of projects) {
      try {
        const project = await scanProject(projectPath, 'scan');
        if (project && !allProjects.find(p => p.id === project.id)) {
          project.workspace = {
            root: wsPath,
            name: basename(wsPath),
          };
          allProjects.push(project);
        }
      } catch (error) {
        errors.push({ path: projectPath, error: String(error) });
      }
    }
  }

  if (settings.workspace.autoDetect) {
    onProgress?.(`Auto-detecting workspaces...`);
    for (const scanPath of configuredPaths) {
      try {
        const workspaces = await detectWorkspaces(scanPath);
        for (const ws of workspaces) {
          if (settings.workspace.paths.includes(ws.root)) continue;
          
          for (const projectPath of ws.projects) {
            try {
              const project = await scanProject(projectPath, 'scan');
              if (project && !allProjects.find(p => p.id === project.id)) {
                project.workspace = {
                  root: ws.root,
                  name: ws.name,
                };
                allProjects.push(project);
              }
            } catch (error) {
              errors.push({ path: projectPath, error: String(error) });
            }
          }
        }
      } catch (error) {
        errors.push({ path: scanPath, error: String(error) });
      }
    }
  }

  return { projects: allProjects, scanned, errors };
}

export async function quickScan(paths: string[]): Promise<ScanResult> {
  return scanPaths({ paths, maxDepth: 1 });
}
