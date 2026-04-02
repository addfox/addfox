import { resolve, join } from 'path';
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

export class AddfoxAdapter extends BaseAdapter {
  readonly name: ExtensionTool = 'addfox';

  async detect(projectPath: string): Promise<boolean> {
    const configFiles = [
      'addfox.config.ts',
      'addfox.config.js',
      'addfox.config.mjs',
      'addfox.config.cjs',
    ];

    for (const file of configFiles) {
      if (existsSync(resolve(projectPath, file))) {
        return true;
      }
    }

    // Check package.json for addfox dependency
    try {
      const pkgPath = resolve(projectPath, 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = await this.readJson(pkgPath);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps.addfox || deps['@addfox/core'] || deps['@addfox/cli']) {
          return true;
        }
      }
    } catch {
      // Ignore
    }

    return false;
  }

  async resolveConfig(projectPath: string): Promise<ToolConfig> {
    const configFiles = [
      'addfox.config.ts',
      'addfox.config.js',
      'addfox.config.mjs',
      'addfox.config.cjs',
    ];

    for (const file of configFiles) {
      const configPath = resolve(projectPath, file);
      if (existsSync(configPath)) {
        try {
          const config = await import(configPath).then(m => m.default || m);
          return {
            entrypointsDir: config.appDir || 'app',
            outDir: config.outDir || 'extension',
            ...config,
          };
        } catch {
          // Continue to next file
        }
      }
    }

    return {
      entrypointsDir: 'app',
      outDir: 'extension',
    };
  }

  async getDevOutputPath(projectPath: string): Promise<string> {
    const config = await this.resolveConfig(projectPath);
    return resolve(projectPath, '.addfox', config.outDir || 'extension');
  }

  async getBuildOutputPath(projectPath: string): Promise<string> {
    return this.getDevOutputPath(projectPath);
  }

  async resolveManifest(projectPath: string): Promise<ExtensionManifest | undefined> {
    const manifestPaths = [
      'app/manifest.json',
      'manifest.json',
      '.addfox/extension/manifest.json',
    ];

    for (const manifestPath of manifestPaths) {
      const fullPath = resolve(projectPath, manifestPath);
      if (existsSync(fullPath)) {
        try {
          return await this.readJson(fullPath);
        } catch {
          // Continue
        }
      }
    }

    return undefined;
  }

  async startDev(projectPath: string, options: DevOptions): Promise<DevHandle> {
    const outputPath = await this.getDevOutputPath(projectPath);
    const progressCallbacks = new Set<(progress: number, message: string, stage?: BuildStage) => void>();
    const buildCompleteCallbacks = new Set<(result: BuildResult) => void>();

    // Report initial progress
    options.onProgress?.(0, 'Initializing...', 'init');
    this.notifyProgress(progressCallbacks, 0, 'Initializing...', 'init');

    const useCommand = options.command;
    const proc = useCommand
      ? spawn(useCommand, [], {
          cwd: projectPath,
          stdio: 'pipe',
          detached: false,
          shell: !!WIN_SUFFIX,
          env: {
            ...process.env,
            BROWSER: 'none',
          },
        })
      : spawn('npx' + WIN_SUFFIX, ['addfox', 'dev', '--no-open'], {
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
        reject(new Error('Dev server start timeout'));
      }, 60000);

      proc.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        // Parse progress from output
        this.parseProgress(chunk, options.onProgress, progressCallbacks);
        
        // Check for ready signal
        if (chunk.includes('Dev server') || chunk.includes('ready')) {
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
            outputPath,
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
      outputPath,
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
        const args = ['addfox', 'build'];
        if (options.target === 'firefox') {
          args.push('-b', 'firefox');
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
        
        if (code === 0) {
          resolve({
            success: true,
            outputPath,
            errors: [],
            warnings: [],
            duration,
          });
        } else {
          resolve({
            success: false,
            outputPath,
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

  private parseProgress(
    chunk: string, 
    onProgress?: (progress: number, message: string, stage?: BuildStage) => void,
    callbacks?: Set<(progress: number, message: string, stage?: BuildStage) => void>
  ): void {
    // Addfox specific progress patterns
    const patterns: { regex: RegExp; progress: number; stage: BuildStage; message: string }[] = [
      { regex: /installing/i, progress: 10, stage: 'install', message: 'Installing dependencies...' },
      { regex: /building|compiling/i, progress: 40, stage: 'build', message: 'Building extension...' },
      { regex: /bundling|packaging/i, progress: 70, stage: 'build', message: 'Bundling...' },
      { regex: /launching|starting/i, progress: 90, stage: 'launch', message: 'Launching dev server...' },
      { regex: /ready|listening/i, progress: 100, stage: 'ready', message: 'Ready' },
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
