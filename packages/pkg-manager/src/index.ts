import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

const PM_PATTERNS: readonly { prefix: string; pm: PackageManager }[] = [
  { prefix: "pnpm", pm: "pnpm" },
  { prefix: "yarn", pm: "yarn" },
  { prefix: "bun", pm: "bun" },
  { prefix: "npm", pm: "npm" },
];

const LOCKFILE_MAP: readonly { file: string; pm: PackageManager }[] = [
  { file: "pnpm-lock.yaml", pm: "pnpm" },
  { file: "bun.lockb", pm: "bun" },
  { file: "yarn.lock", pm: "yarn" },
  { file: "package-lock.json", pm: "npm" },
];

/**
 * Detect the package manager from `npm_config_user_agent`
 * (set automatically by pnpm/npm/yarn/bun when running scripts).
 * Falls back to "npm" when the environment variable is absent.
 */
export function detectPackageManager(
  userAgent: string | undefined = process.env.npm_config_user_agent,
): PackageManager {
  if (!userAgent) return "npm";
  const lower = userAgent.toLowerCase();
  for (const { prefix, pm } of PM_PATTERNS) {
    if (lower.startsWith(prefix)) return pm;
  }
  return "npm";
}

/**
 * Detect the package manager from lockfile presence in a project directory.
 * Falls back to "pnpm" when no lockfile is found.
 */
export function detectFromLockfile(root: string): PackageManager {
  for (const { file, pm } of LOCKFILE_MAP) {
    if (existsSync(resolve(root, file))) return pm;
  }
  return "pnpm";
}

/**
 * Check whether a package is installed (resolvable from project root).
 * Uses Node module resolution so hoisted (e.g. pnpm) deps are detected.
 */
export function isPackageInstalled(root: string, pkgName: string): boolean {
  const require = createRequire(import.meta.url);
  try {
    require.resolve(`${pkgName}/package.json`, { paths: [root] });
    return true;
  } catch {
    return false;
  }
}

/**
 * Return which of the given package names are not installed.
 */
export function getMissingPackages(root: string, pkgNames: readonly string[]): string[] {
  const missing: string[] = [];
  for (const name of pkgNames) {
    if (!isPackageInstalled(root, name)) missing.push(name);
  }
  return missing;
}

const INSTALL_MAP: Record<PackageManager, string> = {
  pnpm: "pnpm install",
  npm: "npm install",
  yarn: "yarn",
  bun: "bun install",
};

const DEV_MAP: Record<PackageManager, string> = {
  pnpm: "pnpm dev",
  npm: "npm run dev",
  yarn: "yarn dev",
  bun: "bun run dev",
};

const EXEC_MAP: Record<PackageManager, string> = {
  pnpm: "pnpx",
  npm: "npx",
  yarn: "yarn dlx",
  bun: "bunx",
};

export function getInstallCommand(pm: PackageManager): string {
  return INSTALL_MAP[pm];
}

export function getRunCommand(pm: PackageManager, script: string): string {
  if (pm === "npm") return `npm run ${script}`;
  return `${pm === "yarn" ? "yarn" : pm} ${script}`;
}

export function getExecCommand(pm: PackageManager): string {
  return EXEC_MAP[pm];
}

/**
 * Returns the `add` command for installing a package.
 * @param dev - whether to add as a dev dependency
 */
export function getAddCommand(pm: PackageManager, pkg: string, dev = false): string {
  const flag = dev ? ADD_DEV_FLAG[pm] : "";
  return `${ADD_PREFIX[pm]} ${pkg}${flag ? ` ${flag}` : ""}`;
}

const ADD_PREFIX: Record<PackageManager, string> = {
  pnpm: "pnpm add",
  npm: "npm install",
  yarn: "yarn add",
  bun: "bun add",
};

const ADD_DEV_FLAG: Record<PackageManager, string> = {
  pnpm: "-D",
  npm: "-D",
  yarn: "-D",
  bun: "-D",
};
