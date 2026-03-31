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
  ExtensionTool 
} from '../../types.js';

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
    // Try to load addfox.config
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
          // Dynamic import (will be transpiled if TS)
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

    // Return defaults
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
    // Same as dev output for addfox
    return this.getDevOutputPath(projectPath);
  }

  async resolveManifest(projectPath: string): Promise<ExtensionManifest | undefined> {
    // Try common manifest locations
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

    // Use addfox CLI directly
    const proc = spawn('npx', ['addfox', 'dev', '--no-open'], {
      cwd: projectPath,
      stdio: 'pipe',
      detached: false,
      env: {
        ...process.env,
        // Prevent auto browser launch
        BROWSER: 'none',
      },
    });

    // Wait for initial build
    await new Promise<void>((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => {
        reject(new Error('Dev server start timeout'));
      }, 60000);

      proc.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        // Check for ready signal
        if (chunk.includes('Dev server') || chunk.includes('ready')) {
          clearTimeout(timeout);
          resolve();
        }
      });

      proc.stderr?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      proc.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          clearTimeout(timeout);
          reject(new Error(`Dev server exited with code ${code}\n${output}`));
        }
      });
    });

    return {
      pid: proc.pid!,
      outputPath,
      close: async () => {
        proc.kill('SIGTERM');
        return new Promise((resolve) => {
          proc.on('exit', () => resolve());
        });
      },
    };
  }

  async build(projectPath: string, options: BuildOptions): Promise<BuildResult> {
    const outputPath = await this.getBuildOutputPath(projectPath);
    const args = ['addfox', 'build'];
    
    if (options.target === 'firefox') {
      args.push('-b', 'firefox');
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
        const duration = Date.now(); // TODO: track actual duration
        
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
}
