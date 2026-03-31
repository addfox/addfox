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

export class PlasmoAdapter extends BaseAdapter {
  readonly name: ExtensionTool = 'plasmo';

  async detect(projectPath: string): Promise<boolean> {
    const configFiles = ['plasmo.config.js', 'plasmo.config.ts', 'plasmo.config.mjs'];
    
    for (const file of configFiles) {
      if (existsSync(resolve(projectPath, file))) {
        return true;
      }
    }

    // Check package.json for plasmo dependency
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
    // Plasmo uses source directory structure
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

    const proc = spawn('npx', ['plasmo', 'dev'], {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Wait for initial build
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Plasmo dev server start timeout'));
      }, 60000);

      proc.stdout?.on('data', (data) => {
        const chunk = data.toString();
        if (chunk.includes('ready') || chunk.includes('Server')) {
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

    return new Promise((resolve, reject) => {
      const proc = spawn('npx', ['plasmo', 'build'], {
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
