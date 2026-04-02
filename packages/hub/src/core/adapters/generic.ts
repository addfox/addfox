import { resolve } from 'path';
import { existsSync } from 'fs';
import { spawn } from 'child_process';
import { BaseAdapter } from './base.js';
import type { 
  ToolConfig, 
  DevOptions, 
  DevHandle, 
  BuildOptions, 
  BuildResult, 
  ExtensionManifest,
  ExtensionTool,
  BuildStage 
} from '../../types.js';

// Package manager command mappings
const PKG_MANAGERS: Record<string, { cmd: string; runArgs: (script: string) => string[] }> = {
  npm: { cmd: 'npm', runArgs: (script) => ['run', script] },
  pnpm: { cmd: 'pnpm', runArgs: (script) => ['run', script] },
  yarn: { cmd: 'yarn', runArgs: (script) => [script] },
};

// Package executor mappings (npx/pnpx/yarn dlx)
const EXECUTORS: Record<string, { cmd: string; prefixArgs?: string[] }> = {
  npm: { cmd: 'npx' },
  pnpm: { cmd: 'pnpx' },
  yarn: { cmd: 'yarn', prefixArgs: ['dlx'] },
};

// Windows command suffix
const WIN_SUFFIX = process.platform === 'win32' ? '.cmd' : '';

/**
 * Generic adapter for extension projects without a specific framework.
 * Supports:
 * 1. Projects with a dev script in package.json - executes the dev script
 * 2. Pure vanilla projects - directly launches browser with the extension
 */
export class GenericAdapter extends BaseAdapter {
  readonly name: ExtensionTool = 'generic';

  async detect(projectPath: string): Promise<boolean> {
    // Must have manifest.json to be a valid extension
    const manifestPath = resolve(projectPath, 'manifest.json');
    if (!existsSync(manifestPath)) {
      return false;
    }

    // Check that no other tool configs exist
    const toolConfigs = [
      'addfox.config.ts', 'addfox.config.js', 'addfox.config.mjs', 'addfox.config.cjs',
      'wxt.config.ts', 'wxt.config.js', 'wxt.config.mjs',
      'plasmo.config.js', 'plasmo.config.ts', 'plasmo.config.mjs',
    ];

    for (const config of toolConfigs) {
      if (existsSync(resolve(projectPath, config))) {
        return false;
      }
    }

    // Check for framework dependencies in package.json
    try {
      const pkgPath = resolve(projectPath, 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = await this.readJson(pkgPath);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        
        // If it has known framework deps, it's not generic
        const frameworkDeps = ['addfox', '@addfox/core', '@addfox/cli', 'wxt', 'plasmo'];
        if (frameworkDeps.some(dep => deps[dep])) {
          return false;
        }
      }
    } catch {
      // Ignore errors, continue detection
    }

    return true;
  }

  async resolveConfig(projectPath: string): Promise<ToolConfig> {
    // Check for custom dev configuration in package.json
    try {
      const pkgPath = resolve(projectPath, 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = await this.readJson(pkgPath);
        
        // Check for hub config in package.json
        if (pkg.hub?.dev) {
          return {
            entrypointsDir: pkg.hub.dev.entrypointsDir || '.',
            outDir: pkg.hub.dev.outDir || '.',
            devCommand: pkg.hub.dev.command,
          };
        }
      }
    } catch {
      // Ignore errors
    }

    return {
      entrypointsDir: '.',
      outDir: '.',
    };
  }

  async getDevOutputPath(projectPath: string): Promise<string> {
    return projectPath;
  }

  async getBuildOutputPath(projectPath: string): Promise<string> {
    return projectPath;
  }

  async resolveManifest(projectPath: string): Promise<ExtensionManifest | undefined> {
    const manifestPath = resolve(projectPath, 'manifest.json');
    if (existsSync(manifestPath)) {
      try {
        return await this.readJson(manifestPath);
      } catch {
        // Ignore
      }
    }
    return undefined;
  }

  /**
   * Check if project has a dev script in package.json
   */
  async hasDevScript(projectPath: string): Promise<{ hasScript: boolean; command?: string }> {
    try {
      const pkgPath = resolve(projectPath, 'package.json');
      if (!existsSync(pkgPath)) {
        return { hasScript: false };
      }

      const pkg = await this.readJson(pkgPath);
      
      // Check for hub-specific dev command first
      if (pkg.hub?.dev?.command) {
        return { hasScript: true, command: pkg.hub.dev.command };
      }
      
      // Check for standard dev script
      if (pkg.scripts?.dev) {
        return { hasScript: true, command: pkg.scripts.dev };
      }
      
      // Check for other common dev scripts
      const devScripts = ['start', 'serve', 'watch'];
      for (const script of devScripts) {
        if (pkg.scripts?.[script]) {
          return { hasScript: true, command: `npm run ${script}` };
        }
      }
    } catch {
      // Ignore errors
    }

    return { hasScript: false };
  }

  async startDev(projectPath: string, options: DevOptions): Promise<DevHandle> {
    const progressCallbacks = new Set<(progress: number, message: string, stage?: BuildStage) => void>();
    const buildCompleteCallbacks = new Set<(result: BuildResult) => void>();

    // Report initial progress
    options.onProgress?.(0, 'Initializing...', 'init');
    this.notifyProgress(progressCallbacks, 0, 'Initializing...', 'init');

    // If a custom command is provided, use it directly
    if (options.command) {
      return this.startDevWithScript(projectPath, options.command, options, progressCallbacks, buildCompleteCallbacks);
    }

    // Check if there's a dev script to run
    const { hasScript, command } = await this.hasDevScript(projectPath);

    if (hasScript && command) {
      // Execute the dev script
      return this.startDevWithScript(projectPath, command, options, progressCallbacks, buildCompleteCallbacks);
    } else {
      // No dev script - directly return with project path for browser loading
      return this.startDevDirect(projectPath, options, progressCallbacks, buildCompleteCallbacks);
    }
  }

  /**
   * Start dev by executing npm run dev
   */
  private async startDevWithScript(
    projectPath: string,
    command: string,
    options: DevOptions,
    progressCallbacks: Set<(progress: number, message: string, stage?: BuildStage) => void>,
    buildCompleteCallbacks: Set<(result: BuildResult) => void>
  ): Promise<DevHandle> {
    // Determine the package manager from lock files
    const pkgManager = existsSync(resolve(projectPath, 'pnpm-lock.yaml'))
      ? 'pnpm'
      : existsSync(resolve(projectPath, 'yarn.lock'))
        ? 'yarn'
        : 'npm';

    // Parse the command to determine execution mode
    const isExecutorCmd = command.startsWith('npx ') || command.startsWith('pnpx ') || command.startsWith('yarn dlx ');
    
    let cmd: string;
    let spawnArgs: string[];

    if (isExecutorCmd) {
      // Use npx/pnpx/yarn dlx for executor-style commands
      const executor = EXECUTORS[pkgManager];
      cmd = executor.cmd + WIN_SUFFIX;
      const parts = command.split(' ').slice(1); // Remove executor prefix
      spawnArgs = executor.prefixArgs ? [...executor.prefixArgs, ...parts] : parts;
    } else {
      // Use package manager run command
      const pm = PKG_MANAGERS[pkgManager];
      cmd = pm.cmd + WIN_SUFFIX;
      
      // Extract script name and args from command like "npm run dev -- --watch"
      const parts = command.split(' ');
      const scriptName = parts.length >= 3 && (parts[0] === 'npm' || parts[0] === 'pnpm' || parts[0] === 'yarn')
        ? parts[2]
        : parts[0];
      const extraArgs = parts.slice(parts.indexOf(scriptName) + 1);
      
      spawnArgs = [...pm.runArgs(scriptName), ...extraArgs];
    }

    const proc = spawn(cmd, spawnArgs, {
      cwd: projectPath,
      stdio: 'pipe',
      detached: false,
      shell: !!WIN_SUFFIX,
      env: {
        ...process.env,
        BROWSER: 'none',
      },
    });

    let serverUrl: string | undefined;
    let buildResult: BuildResult | undefined;

    // Wait for initial build with progress tracking
    await new Promise<void>((resolve, reject) => {
      let output = '';
      let hasResolved = false;
      
      const timeout = setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          resolve(); // Resolve anyway after timeout
        }
      }, 10000); // 10 second timeout for generic projects

      proc.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        // Parse progress from output
        this.parseProgress(chunk, options.onProgress, progressCallbacks);
        
        // Check for ready signals
        if (chunk.includes('listening') || chunk.includes('started') || chunk.includes('ready')) {
          // Try to extract server URL
          const urlMatch = chunk.match(/http:\/\/localhost:\d+/);
          if (urlMatch) {
            serverUrl = urlMatch[0];
          }
          
          if (!hasResolved) {
            hasResolved = true;
            clearTimeout(timeout);
            buildResult = {
              success: true,
              outputPath: projectPath,
              errors: [],
              warnings: [],
              duration: Date.now(),
            };
            this.notifyBuildComplete(buildCompleteCallbacks, buildResult);
            this.notifyProgress(progressCallbacks, 100, 'Ready', 'ready');
            resolve();
          }
        }
      });

      proc.stderr?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        // Check for errors in stderr
        if (chunk.includes('error') || chunk.includes('Error')) {
          this.notifyProgress(progressCallbacks, 0, chunk.trim(), 'error');
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        this.notifyProgress(progressCallbacks, 0, err.message, 'error');
        reject(err);
      });

      proc.on('exit', (code) => {
        if (code !== 0 && code !== null && !hasResolved) {
          clearTimeout(timeout);
          buildResult = {
            success: false,
            outputPath: projectPath,
            errors: [output || 'Dev server exited unexpectedly'],
            warnings: [],
            duration: Date.now(),
          };
          this.notifyBuildComplete(buildCompleteCallbacks, buildResult);
          reject(new Error(`Dev server exited with code ${code}`));
        }
      });
    });

    return {
      pid: proc.pid!,
      outputPath: projectPath,
      serverUrl,
      close: async () => {
        proc.kill('SIGTERM');
        return new Promise((resolve) => {
          proc.on('exit', () => resolve());
        });
      },
      onBuildComplete: (callback: (result: BuildResult) => void) => {
        buildCompleteCallbacks.add(callback);
      },
      onProgress: (callback: (progress: number, message: string, stage?: BuildStage) => void) => {
        progressCallbacks.add(callback);
        return () => progressCallbacks.delete(callback);
      },
    };
  }

  /**
   * Start dev directly without build process (for pure vanilla projects)
   */
  private async startDevDirect(
    projectPath: string,
    options: DevOptions,
    progressCallbacks: Set<(progress: number, message: string, stage?: BuildStage) => void>,
    buildCompleteCallbacks: Set<(result: BuildResult) => void>
  ): Promise<DevHandle> {
    // For vanilla projects, there's no build process
    // Just report progress and return immediately
    options.onProgress?.(0, 'Initializing...', 'init');
    this.notifyProgress(progressCallbacks, 0, 'Initializing...', 'init');
    
    options.onProgress?.(50, 'Loading manifest...', 'build');
    this.notifyProgress(progressCallbacks, 50, 'Loading manifest...', 'build');
    
    options.onProgress?.(100, 'Ready (no build needed)', 'ready');
    this.notifyProgress(progressCallbacks, 100, 'Ready (no build needed)', 'ready');

    const buildResult: BuildResult = {
      success: true,
      outputPath: projectPath,
      errors: [],
      warnings: [],
      duration: 0,
    };

    // Notify callbacks
    for (const callback of buildCompleteCallbacks) {
      try {
        callback(buildResult);
      } catch {
        // Ignore
      }
    }

    return {
      pid: 0,
      outputPath: projectPath,
      close: async () => {
        // Nothing to close
      },
      onBuildComplete: (callback: (result: BuildResult) => void) => {
        buildCompleteCallbacks.add(callback);
        // Immediately notify since build is already complete
        try {
          callback(buildResult);
        } catch {
          // Ignore
        }
      },
      onProgress: (callback: (progress: number, message: string, stage?: BuildStage) => void) => {
        progressCallbacks.add(callback);
        // Immediately notify current state
        callback(100, 'Ready (no build needed)', 'ready');
        return () => progressCallbacks.delete(callback);
      },
    };
  }

  async build(projectPath: string, options: BuildOptions): Promise<BuildResult> {
    // If a custom command is provided, use it directly
    const customCommand = options.command;
    if (customCommand) {
      return new Promise((resolve, reject) => {
        const proc = spawn(customCommand, [], {
          cwd: projectPath,
          stdio: 'pipe',
          shell: !!WIN_SUFFIX,
        });

        let stdout = '';
        let stderr = '';
        const startTime = Date.now();

        proc.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        proc.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        proc.on('close', (code) => {
          const duration = Date.now() - startTime;
          
          if (code === 0) {
            resolve({
              success: true,
              outputPath: projectPath,
              errors: [],
              warnings: [],
              duration,
            });
          } else {
            resolve({
              success: false,
              outputPath: projectPath,
              errors: [stderr || stdout || 'Build failed'],
              warnings: [],
              duration,
            });
          }
        });

        proc.on('error', (err) => {
          reject(err);
        });
      });
    }

    // Check if there's a build script
    try {
      const pkgPath = resolve(projectPath, 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = await this.readJson(pkgPath);
        
        if (pkg.scripts?.build) {
          // Determine package manager and build command
          const pkgManager = existsSync(resolve(projectPath, 'pnpm-lock.yaml'))
            ? 'pnpm'
            : existsSync(resolve(projectPath, 'yarn.lock'))
              ? 'yarn'
              : 'npm';
          
          const pm = PKG_MANAGERS[pkgManager];
          const cmd = pm.cmd + WIN_SUFFIX;
          
          return new Promise((resolve, reject) => {
            const proc = spawn(cmd, pm.runArgs('build'), {
              cwd: projectPath,
              stdio: 'pipe',
              shell: !!WIN_SUFFIX,
            });

            let stdout = '';
            let stderr = '';
            const startTime = Date.now();

            proc.stdout?.on('data', (data) => {
              stdout += data.toString();
            });

            proc.stderr?.on('data', (data) => {
              stderr += data.toString();
            });

            proc.on('close', (code) => {
              const duration = Date.now() - startTime;
              
              if (code === 0) {
                resolve({
                  success: true,
                  outputPath: projectPath,
                  errors: [],
                  warnings: [],
                  duration,
                });
              } else {
                resolve({
                  success: false,
                  outputPath: projectPath,
                  errors: [stderr || stdout || 'Build failed'],
                  warnings: [],
                  duration,
                });
              }
            });

            proc.on('error', (err) => {
              reject(err);
            });
          });
        }
      }
    } catch {
      // Ignore errors
    }

    // No build needed for pure vanilla projects
    return {
      success: true,
      outputPath: projectPath,
      errors: [],
      warnings: [],
      duration: 0,
    };
  }

  private parseProgress(
    chunk: string, 
    onProgress?: (progress: number, message: string, stage?: BuildStage) => void,
    callbacks?: Set<(progress: number, message: string, stage?: BuildStage) => void>
  ): void {
    // Generic progress patterns
    const patterns: { regex: RegExp; progress: number; stage: BuildStage; message: string }[] = [
      { regex: /installing|npm install|pnpm install/i, progress: 10, stage: 'install', message: 'Installing dependencies...' },
      { regex: /building|compiling|bundling/i, progress: 40, stage: 'build', message: 'Building extension...' },
      { regex: /watching|starting|launching/i, progress: 70, stage: 'launch', message: 'Starting dev server...' },
      { regex: /ready|listening|started/i, progress: 100, stage: 'ready', message: 'Ready' },
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(chunk)) {
        onProgress?.(pattern.progress, pattern.message, pattern.stage);
        this.notifyProgress(callbacks, pattern.progress, pattern.message, pattern.stage);
        break;
      }
    }
  }

  private notifyProgress(
    callbacks: Set<(progress: number, message: string, stage?: BuildStage) => void> | undefined,
    progress: number,
    message: string,
    stage?: BuildStage
  ): void {
    if (!callbacks) return;
    for (const callback of callbacks) {
      try {
        callback(progress, message, stage);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private notifyBuildComplete(
    callbacks: Set<(result: BuildResult) => void>,
    result: BuildResult
  ): void {
    for (const callback of callbacks) {
      try {
        callback(result);
      } catch {
        // Ignore callback errors
      }
    }
  }
}
