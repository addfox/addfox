/**
 * Removes app/ entry dirs that are not in the selected entries list.
 * Call after copying template when user did not select "all" entries.
 */

import { readdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ENTRY_APP_DIRS } from "./entries.ts";

const APP_DIR = "app";

export function filterAppEntries(destDir: string, selectedEntries: string[]): void {
  const useAll = selectedEntries.includes("__all__");
  if (useAll) return;

  const keepSet = new Set(selectedEntries);
  const appPath = join(destDir, APP_DIR);
  if (!existsSync(appPath)) return;

  const dirs = readdirSync(appPath, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const dir of dirs) {
    const isEntryDir = ENTRY_APP_DIRS.includes(dir as (typeof ENTRY_APP_DIRS)[number]);
    if (isEntryDir && !keepSet.has(dir)) {
      rmSync(join(appPath, dir), { recursive: true });
    }
  }
}

/** Returns entry dir names that exist under app/ in the template. */
export function getExistingAppEntryDirs(destDir: string): string[] {
  const appPath = join(destDir, APP_DIR);
  if (!existsSync(appPath)) return [];
  return readdirSync(appPath, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => ENTRY_APP_DIRS.includes(name as (typeof ENTRY_APP_DIRS)[number]));
}
