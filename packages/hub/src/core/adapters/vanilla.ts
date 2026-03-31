import { resolve } from 'path';
import { existsSync } from 'fs';
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

/**
 * Adapter for vanilla extension projects (just manifest.json)
 */
export class VanillaAdapter extends BaseAdapter {
  readonly name: ExtensionTool = 'vanilla';

  async detect(projectPath: string): Promise<boolean> {
    // Only detect if manifest.json exists and no other tool configs
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
    // For vanilla projects, the source is the output
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
    // For vanilla projects, there's no build process
    // We just return the project path as output
    return {
      pid: 0, // No process
      outputPath: projectPath,
      close: async () => {
        // Nothing to close
      },
    };
  }

  async build(projectPath: string, options: BuildOptions): Promise<BuildResult> {
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
