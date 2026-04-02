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

export class WxtAdapter extends BaseAdapter {
  readonly name: ExtensionTool = 'wxt';

  async detect(projectPath: string): Promise<boolean> {
    const configFiles = ['wxt.config.ts', 'wxt.config.js', 'wxt.config.mjs'];
    
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
        if (deps.wxt) {
          return true;
        }
      }
    } catch {
      // Ignore
    }

    return false;
  }

  async resolveConfig(projectPath: string): Promise<ToolConfig> {
    const configFiles = ['wxt.config.ts', 'wxt.config.js', 'wxt.config.mjs'];
    
    for (const file of configFiles) {
      const configPath = resolve(projectPath, file);
      if (existsSync(configPath)) {
        try {
          const config = await import(configPath).then(m => m.default || m);
          return {
            entrypointsDir: config.entrypointsDir || 'entrypoints',
            outDir: '.output',
            ...config,
          };
        } catch {
          // Continue
        }
      }
    }

    return {
      entrypointsDir: 'entrypoints',
      outDir: '.output',
    };
  }

  async getDevOutputPath(projectPath: string): Promise<string> {
    return resolve(projectPath, '.output');
  }

  async getBuildOutputPath(projectPath: string): Promise<string> {
    return resolve(projectPath, '.output');
  }

  async resolveManifest(projectPath: string): Promise<ExtensionManifest | undefined> {
    const manifestPath = resolve(projectPath, '.output/manifest.json');
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
      : spawn('npx' + WIN_SUFFIX, ['wxt', 'dev'], {
          cwd: projectPath,
          stdio: 'pipe',
          shell: !!WIN_SUFFIX,
        });

    let buildResult: BuildResult | undefined;

    await new Promise<void>((resolve, reject) => {
      let hasResolved = false;
      const timeout = setTimeout(() => {
        reject(new Error('WXT dev server start timeout'));
      }, 60000);

      proc.stdout?.on('data', (data) => {
        const chunk = data.toString();
        
        // Parse WXT progress
        this.parseProgress(chunk, options.onProgress, progressCallbacks);
        
        if (chunk.includes('ready') || chunk.includes('Built') || chunk.includes('Compiled')) {
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

      proc.on('exit', (code) => {
        if (code !== 0 && code !== null && !hasResolved) {
          clearTimeout(timeout);
          reject(new Error(`WXT dev server exited with code ${code}`));
        }
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
      let proc: ReturnType<typeof spawn>;
      if (options.command) {
        proc = spawn(options.command, [], {
          cwd: projectPath,
          stdio: 'pipe',
          shell: !!WIN_SUFFIX,
        });
      } else {
        const args = ['wxt', 'build'];
        if (options.target === 'firefox') {
          args.push('--browser', 'firefox');
        }
        proc = spawn('npx' + WIN_SUFFIX, args, {
          cwd: projectPath,
          stdio: 'pipe',
          shell: !!WIN_SUFFIX,
        });
      }

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
      { regex: /initializing|starting/i, progress: 10, stage: 'init', message: 'Initializing WXT...' },
      { regex: /resolving|loading/i, progress: 30, stage: 'build', message: 'Resolving dependencies...' },
      { regex: /transforming|transpiling/i, progress: 50, stage: 'build', message: 'Transforming...' },
      { regex: /bundling|building/i, progress: 70, stage: 'build', message: 'Building...' },
      { regex: /writing/i, progress: 90, stage: 'build', message: 'Writing output...' },
      { regex: /ready|built|compiled/i, progress: 100, stage: 'ready', message: 'Ready' },
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
