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
  ExtensionTool 
} from '../../types.js';

export class WxtAdapter extends BaseAdapter {
  readonly name: ExtensionTool = 'wxt';

  async detect(projectPath: string): Promise<boolean> {
    const configFiles = ['wxt.config.ts', 'wxt.config.js', 'wxt.config.mjs'];
    
    for (const file of configFiles) {
      if (existsSync(resolve(projectPath, file))) {
        return true;
      }
    }

    // Check package.json for wxt dependency
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

    const proc = spawn('npx', ['wxt', 'dev'], {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Wait for initial build
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WXT dev server start timeout'));
      }, 60000);

      proc.stdout?.on('data', (data) => {
        const chunk = data.toString();
        if (chunk.includes('ready') || chunk.includes('Built')) {
          clearTimeout(timeout);
          resolve();
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
    };
  }

  async build(projectPath: string, options: BuildOptions): Promise<BuildResult> {
    const outputPath = await this.getBuildOutputPath(projectPath);
    const args = ['wxt', 'build'];
    
    if (options.target === 'firefox') {
      args.push('--browser', 'firefox');
    }

    return new Promise((resolve, reject) => {
      const proc = spawn('npx', args, {
        cwd: projectPath,
        stdio: 'pipe',
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        const duration = Date.now();
        
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
}
