import { resolve } from "path";
import { existsSync, readFileSync } from "fs";
import { spawnSync } from "child_process";
import type { AddfoxResolvedConfig } from "@addfox/core";
import { log, warn } from "@addfox/common";
import { detectFromLockfile } from "@addfox/pkg-manager";
import type { PackageManager } from "@addfox/pkg-manager";

export type { PackageManager };

/** Recommended/required devDependencies for extension dev; auto-installed by framework when missing */
const EXTENSION_DEV_DEPS = ["@types/chrome"] as const;

/** Plugin name → runtime deps required in user project (peer style; auto-install when missing) */
const PLUGIN_PEER_DEPS: Record<string, readonly string[]> = {
  "rsbuild-plugin-vue": ["vue"],
};

/** Exported for tests. */
export function readProjectPackageJson(root: string): { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } | null {
  const p = resolve(root, "package.json");
  if (!existsSync(p)) return null;
  try {
    const raw = readFileSync(p, "utf-8");
    return JSON.parse(raw) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  } catch {
    return null;
  }
}

function isPackageInManifest(root: string, name: string): boolean {
  const pkg = readProjectPackageJson(root);
  if (!pkg) return false;
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  return typeof deps === "object" && Object.prototype.hasOwnProperty.call(deps, name);
}

function getPluginNamesFromConfig(config: AddfoxResolvedConfig): string[] {
  const plugins = config.plugins;
  if (!plugins) return [];
  const list = Array.isArray(plugins) ? plugins : [plugins];
  const names: string[] = [];
  for (const p of list) {
    if (p && typeof p === "object" && "name" in p && typeof (p as { name?: string }).name === "string")
      names.push((p as { name: string }).name);
  }
  return names;
}

function collectPackagesToInstall(root: string, config: AddfoxResolvedConfig): string[] {
  const toInstall: string[] = [];
  for (const name of EXTENSION_DEV_DEPS) {
    if (!isPackageInManifest(root, name)) toInstall.push(name);
  }
  const pluginNames = getPluginNamesFromConfig(config);
  for (const [pluginName, peers] of Object.entries(PLUGIN_PEER_DEPS)) {
    if (!pluginNames.includes(pluginName)) continue;
    for (const pkg of peers) {
      if (!isPackageInManifest(root, pkg)) toInstall.push(pkg);
    }
  }
  return [...new Set(toInstall)];
}

/** Exported for tests. Runs package manager install. */
export function runInstall(root: string, pm: PackageManager, packages: string[], dev: boolean): boolean {
  let cmd: string;
  let args: string[];
  if (pm === "npm") {
    cmd = "npm";
    args = dev ? ["install", "-D", ...packages] : ["install", ...packages];
  } else if (pm === "bun") {
    cmd = "bun";
    args = dev ? ["add", "-d", ...packages] : ["add", ...packages];
  } else {
    cmd = pm;
    args = dev ? ["add", "-D", ...packages] : ["add", ...packages];
  }
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  return result.status === 0;
}

export type RunInstallFn = (
  root: string,
  pm: PackageManager,
  packages: string[],
  dev: boolean
) => boolean;

export interface EnsureDependenciesOptions {
  silent?: boolean;
  runInstall?: RunInstallFn;
}

/**
 * Check that extension dev and plugin deps are installed; install via current package manager if missing.
 * Set ADDFOX_SKIP_DEPS=1 to skip (e.g. CI or user-managed deps).
 * Tests can pass runInstall to avoid real spawn.
 */
export async function ensureDependencies(
  root: string,
  config: AddfoxResolvedConfig,
  options?: EnsureDependenciesOptions
): Promise<{ installed: string[] }> {
  if (process.env.ADDFOX_SKIP_DEPS === "1") return { installed: [] };

  const toInstall = collectPackagesToInstall(root, config);
  if (toInstall.length === 0) return { installed: [] };

  if (!options?.silent) {
    log("Ensuring dev dependencies:", toInstall.join(", "));
  }
  const pm = detectFromLockfile(root);
  const installFn = options?.runInstall ?? runInstall;
  const ok = installFn(root, pm, toInstall, true);
  if (!ok && !options?.silent) {
    warn("Failed to install some dependencies. You may run:", pm, "add -D", toInstall.join(" "));
  }
  return { installed: ok ? toInstall : [] };
}
