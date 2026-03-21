/**
 * Detect front-end framework from project package.json (dependencies / devDependencies).
 * Used for debug error output; falls back to Vanilla when none detected.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type FrontendFramework =
  | "Vanilla"
  | "React"
  | "Vue"
  | "Preact"
  | "Svelte"
  | "Solid";

const FRAMEWORK_KEYS: { pkg: string; name: FrontendFramework }[] = [
  { pkg: "solid-js", name: "Solid" },
  { pkg: "svelte", name: "Svelte" },
  { pkg: "vue", name: "Vue" },
  { pkg: "preact", name: "Preact" },
  { pkg: "react", name: "React" },
];

function readPackageJson(root: string): Record<string, unknown> | null {
  const path = join(root, "package.json");
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function hasDep(pkg: Record<string, unknown>, key: string): boolean {
  const deps = pkg.dependencies as Record<string, string> | undefined;
  const devDeps = pkg.devDependencies as Record<string, string> | undefined;
  if (deps && typeof deps[key] === "string") return true;
  if (devDeps && typeof devDeps[key] === "string") return true;
  return false;
}

/**
 * Detect front-end framework from project root package.json.
 * Checks dependencies/devDependencies for solid-js, svelte, vue, preact, react (first match wins).
 * Returns "Vanilla" when root is empty, package.json missing, or no framework detected.
 */
export function detectFrontendFramework(root: string): FrontendFramework {
  if (!root || typeof root !== "string") return "Vanilla";
  const pkg = readPackageJson(root);
  if (!pkg) return "Vanilla";
  for (const { pkg: key, name } of FRAMEWORK_KEYS) {
    if (hasDep(pkg, key)) return name;
  }
  return "Vanilla";
}
