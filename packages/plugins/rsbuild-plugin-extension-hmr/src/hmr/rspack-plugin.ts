import type { Compiler } from "@rspack/core";
import type { HmrPluginOptions, HmrPluginTestDeps } from "../types";

// ==================== Type Definitions ====================

type WatchFileSystem = {
  watcher?: {
    mtimes?: Map<string, number> | Record<string, number>;
    getTimes?: () => Map<string, number> | Record<string, number>;
  };
};

type ExtendedCompiler = Compiler & {
  modifiedFiles?: ReadonlySet<string>;
  watchFileSystem?: WatchFileSystem;
};

// ==================== State ====================

let lastCompiler: Compiler | null = null;

export function getLastCompiler(): Compiler | null {
  return lastCompiler;
}

// ==================== Modified Files Extraction ====================

/**
 * Collects modified file paths from compiler:
 * - Prefers compiler.modifiedFiles when available (Rspack >= 0.5)
 * - Falls back to watchFileSystem.watcher.mtimes for older versions
 */
export function getModifiedFilesFromCompiler(compiler: Compiler | null): Set<string> {
  const out = new Set<string>();
  if (!compiler) return out;
  
  const c = compiler as ExtendedCompiler;
  
  // Prefer the modern modifiedFiles API
  if (c.modifiedFiles?.size) {
    c.modifiedFiles.forEach(p => out.add(p));
    return out;
  }
  
  // Fall back to watch file system
  const watcher = c.watchFileSystem?.watcher;
  if (!watcher) return out;
  
  try {
    const mtimes = watcher.mtimes ?? watcher.getTimes?.();
    if (!mtimes) return out;
    
    if (mtimes instanceof Map) {
      mtimes.forEach((_, key) => out.add(key));
    } else if (typeof mtimes === "object") {
      Object.keys(mtimes).forEach(key => out.add(key));
    }
  } catch {
    /* ignore watcher access errors */
  }
  
  return out;
}

// ==================== Plugin Factory ====================

const LAUNCH_PLUGIN_NAME = "rsbuild-plugin-extension-hmr:launch";

/**
 * Creates the HMR Rspack plugin that tracks the compiler for change detection.
 * Browser launch has moved to the Rsbuild plugin's onAfterDevCompile hook so it
 * runs after all build artifacts (including copied files) are fully written.
 */
export function createHmrRspackPlugin(
  _options: HmrPluginOptions,
  _testDeps?: HmrPluginTestDeps
): { name: string; apply(compiler: Compiler): void } {
  return {
    name: "rsbuild-plugin-extension-hmr:rspack",
    apply(compiler: Compiler) {
      lastCompiler = compiler;
    },
  };
}
