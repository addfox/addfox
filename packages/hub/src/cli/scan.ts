import { resolve } from 'path';
import { getDB } from '../core/db.js';
import { fullScan, quickScan, scanProject } from '../core/scanner.js';
import { parsePnpmWorkspace, detectPnpmWorkspaceProjects } from '../core/workspace.js';
import { log, success, info, warn } from './utils/output.js';
import { startSpinner, stopSpinner } from './utils/spinner.js';
import { HubError, wrapHandler } from './utils/errors.js';

export const scanCommand = wrapHandler(async (options: {
  path?: string;
  add?: string;
  remove?: string;
  addWorkspace?: string;
  list?: boolean;
}) => {
  const db = getDB();
  await db.init();

  // List scan paths
  if (options.list) {
    const settings = db.settings;
    info('Scan configuration:');
    console.log('');
    console.log('Scan paths:');
    for (const path of settings.scan.paths) {
      console.log(`  - ${path}`);
    }
    console.log('');
    console.log('Workspace paths:');
    for (const path of settings.workspace.paths) {
      console.log(`  - ${path}`);
    }
    console.log('');
    console.log('Manual projects:');
    for (const path of settings.manualProjects) {
      console.log(`  - ${path}`);
    }
    return;
  }

  // Add scan path
  if (options.add) {
    const path = resolve(options.add);
    await db.addScanPath(path);
    success(`Added scan path: ${path}`);
    return;
  }

  // Remove scan path
  if (options.remove) {
    const path = resolve(options.remove);
    await db.removeScanPath(path);
    success(`Removed scan path: ${path}`);
    return;
  }

  // Add workspace path
  if (options.addWorkspace) {
    const path = resolve(options.addWorkspace);
    const workspace = parsePnpmWorkspace(path);
    if (!workspace) {
      throw new HubError(`No pnpm-workspace.yaml found at ${path}`, 'WORKSPACE_NOT_FOUND');
    }
    await db.addWorkspacePath(path);
    success(`Added workspace: ${path}`);
    info(`Found ${workspace.packages.length} package patterns`);
    return;
  }

  // Scan specific path
  if (options.path) {
    const path = resolve(options.path);
    info(`Scanning: ${path}`);
    
    const workspace = parsePnpmWorkspace(path);
    if (workspace) {
      startSpinner('Scanning workspace packages...');
      const projects = await detectPnpmWorkspaceProjects(workspace);
      stopSpinner(true, `Found ${projects.length} packages in workspace`);
      
      for (const projectPath of projects) {
        const project = await scanProject(projectPath, 'scan');
        if (project) {
          await db.addProject(project);
        }
      }
      
      const allProjects = db.projects;
      if (allProjects.length > 0) {
        console.log('');
        console.log(`Total projects: ${allProjects.length}`);
      }
      return;
    }

    // Single project scan
    startSpinner('Scanning project...');
    const isManual = db.settings.manualProjects.includes(path);
    const project = await scanProject(path, isManual ? 'manual' : 'scan');
    stopSpinner(true, project ? 'Project found' : 'No project found');
    
    if (project) {
      await db.addProject(project);
      console.log('');
      console.log(`Name: ${project.name}`);
      console.log(`Tool: ${project.tool}`);
      console.log(`ID: ${project.id}`);
    }
    return;
  }

  // Full scan
  startSpinner('Scanning for projects...');
  
  let progressCount = 0;
  const result = await fullScan(db.settings, (msg) => {
    progressCount++;
    if (progressCount % 10 === 0) {
      // Update spinner text
    }
  });

  stopSpinner(true, `Found ${result.projects.length} projects`);

  for (const project of result.projects) {
    await db.addProject(project);
  }

  if (result.errors.length > 0) {
    warn(`${result.errors.length} errors during scan`);
    for (const err of result.errors.slice(0, 5)) {
      warn(`  ${err.path}: ${err.error}`);
    }
  }

  console.log('');
  console.log(`Total projects: ${db.projects.length}`);
  console.log(`Scan errors: ${result.errors.length}`);
});
