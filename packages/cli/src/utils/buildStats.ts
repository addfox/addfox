import { resolve } from "path";
import { existsSync, statSync, readdirSync } from "fs";

/** Recursively compute directory size in bytes. */
export function getDistSizeSync(dirPath: string): number {
  if (!existsSync(dirPath)) return -1;
  const stat = statSync(dirPath);
  if (!stat.isDirectory()) return stat.size;
  let total = 0;
  for (const name of readdirSync(dirPath)) {
    const s = statSync(resolve(dirPath, name));
    total += s.isDirectory() ? getDistSizeSync(resolve(dirPath, name)) : s.size;
  }
  return total;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

/** Whether the Rsbuild config has JS source map enabled (any format). */
export function isSourceMapEnabled(
  rsbuildConfig: { 
    output?: { sourceMap?: unknown };
    tools?: { rspack?: { plugins?: unknown[] } };
  }
): boolean {
  // 1. Check the output.sourceMap setting
  const sm = rsbuildConfig?.output?.sourceMap;
  if (sm === true) return true;
  if (sm && typeof sm === "object" && typeof (sm as { js?: string }).js === "string") {
    return true;
  }
  
  // 2. Check whether SourceMapDevToolPlugin is used to exclude vendor source maps in dev mode
  const plugins = rsbuildConfig?.tools?.rspack?.plugins;
  if (Array.isArray(plugins)) {
    for (const plugin of plugins) {
      if (plugin && typeof plugin === "object") {
        const name = (plugin as { name?: string; constructor?: { name?: string } }).name;
        const ctorName = (plugin as { constructor?: { name?: string } }).constructor?.name;
        if (name === "SourceMapDevToolPlugin" || ctorName === "SourceMapDevToolPlugin") {
          return true;
        }
      }
    }
  }
  
  return false;
}

/** Source-map label shown in the CLI size log. */
export function getSourceMapLabel(
  rsbuildConfig: { 
    output?: { sourceMap?: unknown };
    tools?: { rspack?: { plugins?: unknown[] } };
  }
): string {
  if (!isSourceMapEnabled(rsbuildConfig)) return "";
  return " (with inline-source-map, vendor excluded)";
}

/** Get total size of build output from Rsbuild build result (stats.assets). */
export function getBuildOutputSize(result: unknown): number | null {
  const stats = (
    result as {
      stats?: {
        toJson?: (opts: unknown) => { assets?: Array<{ size?: number }> };
      };
    }
  )?.stats;
  if (!stats?.toJson) return null;
  try {
    const json = stats.toJson({ all: false, assets: true });
    const assets = json?.assets;
    if (!Array.isArray(assets)) return null;
    let total = 0;
    for (const a of assets) {
      if (a && typeof a.size === "number") total += a.size;
    }
    return total > 0 ? total : null;
  } catch {
    return null;
  }
}
