import type { ToolAdapter, ExtensionTool } from '../../types.js';
import { AddfoxAdapter } from './addfox.js';
import { WxtAdapter } from './wxt.js';
import { PlasmoAdapter } from './plasmo.js';
import { VanillaAdapter } from './vanilla.js';

export * from './base.js';
export * from './addfox.js';
export * from './wxt.js';
export * from './plasmo.js';
export * from './vanilla.js';

const adapters: ToolAdapter[] = [
  new AddfoxAdapter(),
  new WxtAdapter(),
  new PlasmoAdapter(),
  new VanillaAdapter(),
];

export async function detectAdapter(projectPath: string): Promise<ToolAdapter | null> {
  // Check in priority order
  for (const adapter of adapters) {
    if (await adapter.detect(projectPath)) {
      return adapter;
    }
  }
  return null;
}

export function getAdapter(tool: ExtensionTool): ToolAdapter | null {
  return adapters.find(a => a.name === tool) || null;
}

export function getAllAdapters(): ToolAdapter[] {
  return [...adapters];
}
