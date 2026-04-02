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

// Windows command suffix
const WIN_SUFFIX = process.platform === 'win32' ? '.cmd' : '';

export class PlasmoAdapter extends BaseAdapter {
  readonly name: ExtensionTool = 'plasmo';

  async detect(projectPath: string): Promise<boolean> {
    const configFiles = ['plasmo.config.js', 'plasmo.config.ts', 'plasmo.config.mjs'];
    
    for (const file of configFiles) {
      if (existsSync(resolve(projectPath, file))) {
        return true;
      }
    }

    try {
      const pkgPath = resolve(projectPath, 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = await this.readJson(pkgPath);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps.plasmo) {
          return true;
        }
      }
    } catch {
      // Ignore
    }

    return false;
  }

  async resolveConfig(projectPath: string): Promise<ToolConfig> {
    return {
      entrypointsDir: '.',
      outDir: '.plasmo',
    };
  }

  async getDevOutputPath(projectPath: string): Promise<string> {
    return resolve(projectPath, '.plasmo');
  }

  async getBuildOutputPath(projectPath: string): Promise<string> {
    return resolve(projectPath, 'build');
  }

  async resolveManifest(projectPath: string): Promise<ExtensionManifest | undefined> {
    const manifestPath = resolve(projectPath, '.plasmo/manifest.json');
    if (existsSync(manifestPath)) {
      try {
        return await this.readJson(manifestPath);
      } catch {
        // Ignore
      }
    }
    return undefined;
  }

  async startDev(projectPath: string, options: DevOptions): Promise<DevHandle> {
    const outputPath = await this.getDevOutputPath(projectPath);
    const progressCallbacks = new Set<(progress: number, message: string, stage?: BuildStage) => void>();
    const buildCompleteCallbacks = new Set<(result: BuildResult) => void>();

    options.onProgress?.(0, 'Initializing...', 'init');
    this.notifyProgress(progressCallbacks, 0, 'Initializing...', 'init');

    const proc = options.command
      ? spawn(options.command, [], {
          cwd: projectPath,
          stdio: 'pipe',
          shell: !!WIN_SUFFIX,
        })
      : spawn('npx' + WIN_SUFFIX, ['plasmo', 'dev'], {
          cwd: projectPath,
          stdio: 'pipe',
          shell: !!WIN_SUFFIX,
        });

    let buildResult: BuildResult | undefined;

    await new Promise<void>((resolve, reject) => {
      let hasResolved = false;
      const timeout = setTimeout(() => {
        reject(new Error('Plasmo dev server start timeout'));
      }, 60000);

      proc.stdout?.on('data', (data) => {
        const chunk = data.toString();
        
        this.parseProgress(chunk, options.onProgress, progressCallbacks);
        
        if (chunk.includes('ready') || chunk.includes('Server')) {
          if (!hasResolved) {
            hasResolved = true;
            clearTimeout(timeout);
            buildResult = {
              success: true,
              outputPath,
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
        if (chunk.includes('error') || chunk.includes('Error')) {
          this.notifyProgress(progressCallbacks, 0, chunk.trim(), 'error');
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    return {
      pid: proc.pid!,
      outputPath,
      close: async () => {
        proc.kill('SIGTERM');
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

  async build(projectPath: string, options: BuildOptions): Promise<BuildResult> {
    const outputPath = await this.getBuildOutputPath(projectPath);

    return new Promise((resolve, reject) => {
      const proc = options.command
        ? spawn(options.command, [], {
            cwd: projectPath,
            stdio: 'pipe',
            shell: !!WIN_SUFFIX,
          })
        : spawn('npx' + WIN_SUFFIX, ['plasmo', 'build'], {
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
        
        resolve({
          success: code === 0,
          outputPath,
          errors: code === 0 ? [] : [stderr || stdout || 'Build failed'],
          warnings: [],
          duration,
        });
      });

      proc.on('error', reject);
    });
  }

  private parseProgress(
    chunk: string,
    onProgress?: (progress: number, message: string, stage?: BuildStage) => void,
    callbacks?: Set<(progress: number, message: string, stage?: BuildStage) => void>
  ): void {
    const patterns: { regex: RegExp; progress: number; stage: BuildStage; message: string }[] = [
      { regex: /initializing|starting/i, progress: 10, stage: 'init', message: 'Initializing Plasmo...' },
      { regex: /generating|creating/i, progress: 30, stage: 'build', message: 'Generating manifest...' },
      { regex: /bundling|packaging/i, progress: 60, stage: 'build', message: 'Bundling extension...' },
      { regex: /building/i, progress: 80, stage: 'build', message: 'Building...' },
      { regex: /ready|server started/i, progress: 100, stage: 'ready', message: 'Ready' },
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
        // Ignore
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
        // Ignore
      }
    }
  }
}
