/**
 * Reload manager helpers: map entries to ReloadManagerEntry for HMR plugin.
 */

import { resolve } from "path";
import type { EntryInfo, ReloadManagerEntry } from "./types.js";
import { RELOAD_MANAGER_ENTRY_NAMES } from "./constants.js";

/**
 * Build reloadManagerEntries from pipeline entries (filter + resolve path).
 * Used by CLI when building HMR plugin options.
 */
export function toReloadManagerEntries(
  entries: EntryInfo[],
  root: string
): ReloadManagerEntry[] {
  return entries
    .filter((e) => RELOAD_MANAGER_ENTRY_NAMES.has(e.name))
    .map((e) => ({ name: e.name, path: resolve(root, e.scriptPath) }));
}
