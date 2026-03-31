import type { ToolAdapter, ToolConfig, DevOptions, DevHandle, BuildOptions, BuildResult, ExtensionManifest, ExtensionTool } from '../../types.js';

export abstract class BaseAdapter implements ToolAdapter {
  abstract readonly name: ExtensionTool;

  abstract detect(projectPath: string): Promise<boolean>;
  
  abstract resolveConfig(projectPath: string): Promise<ToolConfig>;
  
  abstract getDevOutputPath(projectPath: string): Promise<string>;
  
  abstract getBuildOutputPath(projectPath: string): Promise<string>;
  
  abstract startDev(projectPath: string, options: DevOptions): Promise<DevHandle>;
  
  abstract build(projectPath: string, options: BuildOptions): Promise<BuildResult>;
  
  abstract resolveManifest(projectPath: string): Promise<ExtensionManifest | undefined>;

  protected async fileExists(path: string): Promise<boolean> {
    const { existsSync } = await import('fs');
    return existsSync(path);
  }

  protected async readJson(path: string): Promise<any> {
    const { readFileSync } = await import('fs');
    return JSON.parse(readFileSync(path, 'utf-8'));
  }
}
