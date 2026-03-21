import { resolve } from "path";
import { getEntryTag, HMR_INVALIDATE_PREPEND } from "../constants";
import type { ReloadManagerEntry } from "@addfox/core";

// ==================== Path Utilities ====================

/** Cache for normalized paths to avoid repeated resolve operations */
const pathCache = new Map<string, string>();

export function normalizePathForCompare(p: string): string {
  const cached = pathCache.get(p);
  if (cached) return cached;
  
  const normalized = resolve(p).replace(/\\/g, "/");
  pathCache.set(p, normalized);
  return normalized;
}

/** Clear the path cache (useful for testing or memory management) */
export function clearPathCache(): void {
  pathCache.clear();
}

// ==================== Entry Matching ====================

function createPathComparer(resourcePath: string): {
  normalized: string;
  matches: (entryPath: string) => boolean;
} {
  const normalized = normalizePathForCompare(resourcePath);
  return {
    normalized,
    matches: (entryPath: string) => normalizePathForCompare(entryPath) === normalized,
  };
}

function findEntryByPath<T extends { path: string }>(
  resourcePath: string,
  entries: T[]
): T | undefined {
  const comparer = createPathComparer(resourcePath);
  return entries.find(e => comparer.matches(e.path));
}

// ==================== Type Guards ====================

function isReloadManagerEntryList(
  v: unknown[]
): v is ReloadManagerEntry[] {
  return v.length > 0 && 
         typeof v[0] === "object" && 
         v[0] !== null && 
         "path" in v[0];
}

// ==================== Code Transformation ====================

/**
 * Converts string paths to ReloadManagerEntry objects with empty names.
 */
function normalizeEntries(
  entriesOrPaths: ReloadManagerEntry[] | string[]
): ReloadManagerEntry[] {
  if (isReloadManagerEntryList(entriesOrPaths)) {
    return entriesOrPaths;
  }
  return (entriesOrPaths as string[]).map(path => ({ name: "", path }));
}

/**
 * Builds the transformed code by prepending entry tag and HMR invalidate.
 */
function buildTransformedCode(entryName: string, originalCode: string): string {
  const tag = entryName ? getEntryTag(entryName) : "";
  const parts: string[] = [];
  
  if (tag) parts.push(tag);
  parts.push(HMR_INVALIDATE_PREPEND, originalCode);
  
  return parts.join("\n");
}

/**
 * Transforms content/background entry modules:
 * - Injects entry tag comment (addfox-entry:content / addfox-entry:background) at top when entries have names.
 * - Prepends module.hot.invalidate() so reload is via reloadManager only.
 */
export function transformCodeToDisableHmr(
  resourcePath: string,
  entriesOrPaths: ReloadManagerEntry[] | string[],
  code: string
): string {
  if (entriesOrPaths.length === 0) return code;
  
  const entries = normalizeEntries(entriesOrPaths);
  const matchingEntry = findEntryByPath(resourcePath, entries);
  
  if (!matchingEntry) return code;
  
  return buildTransformedCode(matchingEntry.name, code);
}
