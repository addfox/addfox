import type { Compiler } from "@rspack/core";
import {
  launchBrowser,
  registerCleanupHandlers,
  statsHasErrors,
  setBrowserLaunched,
  getBrowserLaunched,
  type ChromiumRunnerOverride,
} from "../browser/launcher";
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
 * Creates the HMR Rspack plugin that handles browser launch on first successful compilation.
 */
export function createHmrRspackPlugin(
  options: HmrPluginOptions,
  testDeps?: HmrPluginTestDeps
): { name: string; apply(compiler: Compiler): void } {
  const { autoOpen = true } = options;

  return {
    name: "rsbuild-plugin-extension-hmr:rspack",
    apply(compiler: Compiler) {
      lastCompiler = compiler;
      const { done } = compiler.hooks;
      if (!done) return;

      registerCleanupHandlers();

      done.tap(LAUNCH_PLUGIN_NAME, async (stats) => {
        if (!autoOpen || getBrowserLaunched()) return;
        if (statsHasErrors(stats)) return;
        setBrowserLaunched(true);
        // Launch browser immediately - WebSocket server is already started in parallel
        // Reload manager extension will auto-connect via its reconnection mechanism
        try {
          await launchBrowser(
            options,
            testDeps?.runChromiumRunner as ChromiumRunnerOverride | undefined,
            testDeps?.ensureDistReady,
            testDeps?.getBrowserPath
          );
        } catch (e) {
          const { error } = await import("@addfox/common");
          error("Failed to launch browser:", e);
        }
      });
    },
  };
}
