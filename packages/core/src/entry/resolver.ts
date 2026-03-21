/**
 * Entry resolution - resolves entry configuration
 * Priority: 1. config.entry > 2. manifest entries > 3. auto-discovery
 */

import { resolve, dirname, basename } from "path";
import { existsSync } from "fs";
import type { AddfoxUserConfig, EntryInfo, EntryConfigValue, ManifestRecord } from "../types.ts";
import { HTML_ENTRY_NAMES, SCRIPT_EXTS } from "../constants.ts";
import type { BrowserTarget } from "../constants.ts";
import { discoverEntries, type EntryDiscovererOptions } from "./discoverer.ts";
import {
  getScriptInjectIfMatches,
  parseAddfoxEntryFromHtml,
  resolveScriptFromHtmlStrict,
} from "./html.ts";
import { AddfoxError, ADDFOX_ERROR_CODES } from "@addfox/common";
import { extractEntriesFromManifest, type ParsedEntryFromManifest } from "./manifestParser.ts";

// ============================================================================
// Types
// ============================================================================

export interface EntryResolverOptions {
  entryDiscovererOptions?: EntryDiscovererOptions;
  /** Target browser for manifest entry extraction */
  browser?: BrowserTarget;
}

export interface EntryResolutionResult {
  entries: EntryInfo[];
  /** Map of manifest field paths to entry names for output path replacement */
  manifestReplacementMap?: Map<string, string>;
}

// ============================================================================
// Utilities
// ============================================================================

const HTML_ENTRY_SET = new Set(HTML_ENTRY_NAMES);

function isHtmlPath(pathStr: string): boolean {
  return pathStr.trim().toLowerCase().endsWith(".html");
}

function isScriptPath(pathStr: string): boolean {
  const lower = pathStr.trim().toLowerCase();
  return SCRIPT_EXTS.some(ext => lower.endsWith(ext));
}

function findScriptInDir(dir: string): string | undefined {
  for (const ext of SCRIPT_EXTS) {
    const p = resolve(dir, `index${ext}`);
    if (existsSync(p)) return p;
  }
  return undefined;
}

function findScriptForHtmlDir(dir: string, htmlFilename: string): string | undefined {
  const stem = basename(htmlFilename, ".html");
  for (const ext of SCRIPT_EXTS) {
    const p = resolve(dir, `${stem}${ext}`);
    if (existsSync(p)) return p;
  }
  return findScriptInDir(dir);
}

function isEntryConfigObject(value: EntryConfigValue): value is { src: string; html?: boolean | string } {
  return typeof value === "object" && value !== null && "src" in value;
}

function resolveHtmlPath(baseDir: string, htmlValue: string | undefined): string | undefined {
  if (!htmlValue) return undefined;
  const resolved = resolve(baseDir, htmlValue);
  if (!isHtmlPath(resolved)) return undefined;
  return existsSync(resolved) ? resolved : undefined;
}

function resolveHtmlFlag(
  entryName: string,
  htmlValue: boolean | string | undefined,
  hasTemplate: boolean
): boolean {
  if (htmlValue === false) return false;
  if (htmlValue === true) return true;
  if (typeof htmlValue === "string") return hasTemplate;
  return isHtmlEntryName(entryName);
}

function isHtmlEntryName(entryName: string): boolean {
  return HTML_ENTRY_SET.has(entryName as (typeof HTML_ENTRY_NAMES)[number]);
}

function enrichEntryWithScriptInject(entry: EntryInfo): EntryInfo {
  if (!entry.htmlPath || !entry.scriptPath) return entry;
  const scriptInject = getScriptInjectIfMatches(entry.htmlPath, entry.scriptPath);
  return scriptInject ? { ...entry, scriptInject } : entry;
}

function inferHtmlPathForReservedName(entryName: string, scriptPath: string): string | undefined {
  if (!HTML_ENTRY_SET.has(entryName as (typeof HTML_ENTRY_NAMES)[number])) return undefined;
  const dir = dirname(scriptPath);
  const htmlPath = resolve(dir, "index.html");
  return existsSync(htmlPath) ? htmlPath : undefined;
}

// ============================================================================
// Entry Resolution
// ============================================================================

function resolveEntryFromObject(
  baseDir: string,
  name: string,
  value: { src: string; html?: boolean | string }
): EntryInfo | null {
  const scriptPath = resolve(baseDir, value.src);
  if (!existsSync(scriptPath) || !isScriptPath(scriptPath)) return null;
  
  const htmlPath = resolveHtmlPath(baseDir, typeof value.html === "string" ? value.html : undefined);
  if (typeof value.html === "string" && !htmlPath) return null;
  
  const inferredHtml = htmlPath ?? inferHtmlPathForReservedName(name, scriptPath);
  const html = resolveHtmlFlag(name, value.html, Boolean(htmlPath));
  
  return enrichEntryWithScriptInject({ name, scriptPath, htmlPath: inferredHtml, html });
}

function resolveEntryFromHtml(
  baseDir: string,
  name: string,
  pathStr: string
): EntryInfo | null {
  const htmlPath = resolve(baseDir, pathStr);
  const dir = dirname(htmlPath);
  
  let parsed: ReturnType<typeof parseAddfoxEntryFromHtml>;
  try {
    parsed = parseAddfoxEntryFromHtml(htmlPath);
  } catch {
    parsed = undefined;
  }
  
  let scriptPath: string | undefined;
  if (parsed) {
    try {
      scriptPath = resolveScriptFromHtmlStrict(htmlPath).scriptPath;
    } catch (e) {
      throw new AddfoxError({
        code: ADDFOX_ERROR_CODES.ENTRY_SCRIPT_FROM_HTML,
        message: "Invalid data-addfox-entry script in HTML",
        details: `HTML: ${htmlPath}. ${e instanceof Error ? e.message : String(e)}`,
        hint: "data-addfox-entry script must have a relative src and the file must exist",
      });
    }
  } else {
    scriptPath = findScriptForHtmlDir(dir, basename(htmlPath));
  }
  
  if (!scriptPath) return null;
  
  return enrichEntryWithScriptInject({
    name,
    scriptPath,
    htmlPath,
    html: true,
    outputFollowsScriptPath: Boolean(parsed),
  });
}

function resolveEntryFromScript(
  baseDir: string,
  name: string,
  pathStr: string
): EntryInfo | null {
  const scriptPath = resolve(baseDir, pathStr);
  if (!existsSync(scriptPath)) return null;
  
  const htmlPath = inferHtmlPathForReservedName(name, scriptPath);
  const html = isHtmlEntryName(name);
  
  return enrichEntryWithScriptInject({ name, scriptPath, htmlPath, html });
}

function resolveSingleEntry(
  baseDir: string,
  name: string,
  value: EntryConfigValue
): EntryInfo | null {
  if (isEntryConfigObject(value)) {
    return resolveEntryFromObject(baseDir, name, value);
  }
  
  const resolved = resolve(baseDir, value);
  if (!existsSync(resolved)) return null;
  
  if (isHtmlPath(value)) {
    return resolveEntryFromHtml(baseDir, name, value);
  }
  
  if (isScriptPath(value)) {
    return resolveEntryFromScript(baseDir, name, value);
  }
  
  return null;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Resolve entries with priority:
 * 1. config.entry (highest priority)
 * 2. manifest entries (if config.entry doesn't specify)
 * 3. auto-discovery (lowest priority)
 */
export function resolveEntries(
  config: Pick<AddfoxUserConfig, "entry" | "appDir">,
  _root: string,
  baseDir: string,
  manifest?: ManifestRecord,
  options?: EntryResolverOptions
): EntryResolutionResult {
  const browser = options?.browser ?? "chromium";
  
  // Step 1: Start with auto-discovered entries (lowest priority)
  const defaultEntries = discoverEntries(baseDir, options?.entryDiscovererOptions);
  const entryMap = new Map<string, EntryInfo>(defaultEntries.map(e => [e.name, e]));
  
  // Track manifest replacement map for output path replacement
  let manifestReplacementMap: Map<string, string> | undefined;
  
  // Step 2: Apply manifest entries (middle priority) - only if no config.entry
  const entryConfig = config.entry;
  const hasExplicitEntryConfig = entryConfig && Object.keys(entryConfig).length > 0;
  
  if (manifest && !hasExplicitEntryConfig) {
    const manifestResult = extractEntriesFromManifest(manifest, browser);
    manifestReplacementMap = manifestResult.replacementMap;
    
    for (const [name, pathStr] of Object.entries(manifestResult.entries)) {
      // Only apply if entry not already resolved from config.entry
      const resolved = resolveSingleEntry(baseDir, name, pathStr);
      if (resolved) {
        entryMap.set(name, resolved);
      }
    }
  }
  
  // Step 3: Apply config.entry (highest priority) - always overrides
  if (hasExplicitEntryConfig) {
    for (const [name, pathStr] of Object.entries(entryConfig)) {
      const resolved = resolveSingleEntry(baseDir, name, pathStr);
      if (resolved) entryMap.set(name, resolved);
      else entryMap.delete(name);
    }
  }
  
  return {
    entries: Array.from(entryMap.values()),
    manifestReplacementMap,
  };
}

/**
 * Legacy API - returns just the entries array for backward compatibility
 */
export function resolveEntriesLegacy(
  config: Pick<AddfoxUserConfig, "entry" | "appDir">,
  _root: string,
  baseDir: string,
  options?: EntryResolverOptions
): EntryInfo[] {
  return resolveEntries(config, _root, baseDir, undefined, options).entries;
}

export { extractEntriesFromManifest, type ParsedEntryFromManifest };
