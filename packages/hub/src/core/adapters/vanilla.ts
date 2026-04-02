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

const WIN_SUFFIX = process.platform === 'win32' ? '.cmd' : '';

/**
 * Adapter for vanilla extension projects (just manifest.json)
 */
export class VanillaAdapter extends BaseAdapter {
  readonly name: ExtensionTool = 'vanilla';

  async detect(projectPath: string): Promise<boolean> {
    const manifestPath = resolve(projectPath, 'manifest.json');
    if (!existsSync(manifestPath)) {
      return false;
    }

    // Check that no other tool configs exist
    const toolConfigs = [
      'addfox.config.ts', 'addfox.config.js', 'addfox.config.mjs',
      'wxt.config.ts', 'wxt.config.js', 'wxt.config.mjs',
      'plasmo.config.js', 'plasmo.config.ts', 'plasmo.config.mjs',
    ];

    for (const config of toolConfigs) {
      if (existsSync(resolve(projectPath, config))) {
        return false;
      }
    }

    return true;
  }

  async resolveConfig(projectPath: string): Promise<ToolConfig> {
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

  async startDev(projectPath: string, options: DevOptions): Promise<DevHandle> {
    const progressCallbacks = new Set<(progress: number, message: string, stage?: BuildStage) => void>();
    const buildCompleteCallbacks = new Set<(result: BuildResult) => void>();

    // If a custom command is provided, execute it
    if (options.command) {
      const proc = spawn(options.command, [], {
        cwd: projectPath,
        stdio: 'pipe',
        shell: !!WIN_SUFFIX,
        env: {
          ...process.env,
          BROWSER: 'none',
        },
      });

      let hasResolved = false;
      let serverUrl: string | undefined;

      const timeout = setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
        }
      }, 10000);

      proc.stdout?.on('data', (data) => {
        const chunk = data.toString();
        const urlMatch = chunk.match(/http:\/\/localhost:\d+/);
        if (urlMatch) serverUrl = urlMatch[0];
      });

      proc.stderr?.on('data', () => {});

      proc.on('error', () => clearTimeout(timeout));
      proc.on('exit', () => clearTimeout(timeout));

      return {
        pid: proc.pid!,
        outputPath: projectPath,
        serverUrl,
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

    // For vanilla projects, there's no build process
    // Just report progress and return immediately
    options.onProgress?.(0, 'Initializing...', 'init');
    options.onProgress?.(50, 'Loading manifest...', 'build');
    options.onProgress?.(100, 'Ready (no build needed)', 'ready');

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

        proc.stdout?.on('data', (data) => { stdout += data.toString(); });
        proc.stderr?.on('data', (data) => { stderr += data.toString(); });

        proc.on('close', (code) => {
          const duration = Date.now() - startTime;
          resolve({
            success: code === 0,
            outputPath: projectPath,
            errors: code === 0 ? [] : [stderr || stdout || 'Build failed'],
            warnings: [],
            duration,
          });
        });

        proc.on('error', reject);
      });
    }

    // Vanilla projects don't need building
    return {
      success: true,
      outputPath: projectPath,
      errors: [],
      warnings: [],
      duration: 0,
    };
  }
}
