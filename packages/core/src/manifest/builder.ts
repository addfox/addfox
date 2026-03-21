/**
 * Manifest builder - builds extension manifest for target browsers
 */

import type { ManifestConfig, ManifestRecord, ChromiumFirefoxManifest, EntryInfo } from "../types.ts";
import { basename, extname } from "path";
import { MANIFEST_ENTRY_PATHS, MANIFEST_ENTRY_KEYS, SCRIPT_ONLY_ENTRY_NAMES } from "../constants.ts";
import type { BrowserTarget } from "../constants.ts";

/** Content script build output */
export interface ContentScriptOutput {
  js: string[];
  css: string[];
  autoFillCssInManifest?: boolean;
}

type FillAction = (out: ManifestRecord, path: string) => void;

type ManifestPickerResult = { manifest: ManifestRecord; warnMessage?: string };

const ADDFOX_PLACEHOLDER_REGEX = /\[addfox\.([a-z]+)\]/g;
const CONTENT_PLACEHOLDER = "[addfox.content]";
const CONTENT_PLACEHOLDER_LEGACY = "[addfox.content]";
const SCRIPT_KEYS_SET = new Set<string>(SCRIPT_ONLY_ENTRY_NAMES);

/** Check if a path looks like a source file (not a build output) */
function isSourceFilePath(path: string): boolean {
  const lower = path.trim().toLowerCase();
  return /\.(ts|tsx|js|jsx)$/.test(lower);
}

function isChromiumFirefoxManifest(m: ManifestConfig): m is ChromiumFirefoxManifest {
  return typeof m === "object" && m !== null && ("chromium" in m || "firefox" in m);
}

function isEntryFieldEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function hasNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0;
}

function isManifestRecord(value: unknown): value is ManifestRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function getManifestRecordForTarget(config: ManifestConfig, target: BrowserTarget): ManifestRecord {
  return pickManifestForTarget(config, target).manifest;
}

function pickManifestForTarget(config: ManifestConfig, target: BrowserTarget): ManifestPickerResult {
  if (!isChromiumFirefoxManifest(config)) {
    return { manifest: config };
  }

  const hasChromium = config.chromium != null && typeof config.chromium === "object";
  const hasFirefox = config.firefox != null && typeof config.firefox === "object";

  // Both browsers defined
  if (hasChromium && hasFirefox) {
    const match = config[target];
    if (match != null && typeof match === "object") {
      return { manifest: match as ManifestRecord };
    }
    const fallback = (target === "firefox" ? config.chromium : config.firefox)!;
    return {
      manifest: fallback,
      warnMessage: `Build target is ${target} but manifest.${target} is missing; using ${target === "firefox" ? "chromium" : "firefox"} manifest.`,
    };
  }

  // Only Chromium
  if (hasChromium) {
    return {
      manifest: config.chromium!,
      warnMessage: target === "firefox" 
        ? "Build target is firefox but manifest only has chromium; using chromium manifest."
        : undefined,
    };
  }

  // Only Firefox
  if (hasFirefox) {
    return {
      manifest: config.firefox!,
      warnMessage: target === "chromium"
        ? "Build target is chromium but manifest only has firefox; using firefox manifest."
        : undefined,
    };
  }

  // Fallback
  return {
    manifest: (config.chromium ?? config.firefox) ?? {},
    warnMessage: "Manifest has no chromium or firefox object; using fallback.",
  };
}

function buildScriptOutputPath(entry: EntryInfo): string {
  const scriptStem = basename(entry.scriptPath, extname(entry.scriptPath));
  return scriptStem === entry.name ? `${entry.name}.js` : `${entry.name}/index.js`;
}

function buildHtmlOutputPath(entry: EntryInfo, fallback: string): string {
  if (!entry.htmlPath) return fallback;
  const htmlFile = basename(entry.htmlPath).toLowerCase();
  return htmlFile === `${entry.name}.html` ? `${entry.name}.html` : fallback;
}

function buildPlaceholderMap(entries: EntryInfo[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const key of MANIFEST_ENTRY_KEYS) {
    const entry = entries.find((e) => e.name === key);
    if (!entry) continue;
    map[key] = SCRIPT_KEYS_SET.has(key)
      ? buildScriptOutputPath(entry)
      : buildHtmlOutputPath(entry, MANIFEST_ENTRY_PATHS[key]);
  }
  return map;
}

/**
 * Build a map from source file paths to output paths
 * This is used to replace source paths in manifest with build output paths
 */
function buildSourceToOutputMap(entries: EntryInfo[]): Map<string, string> {
  const map = new Map<string, string>();
  const placeholderMap = buildPlaceholderMap(entries);
  
  for (const key of MANIFEST_ENTRY_KEYS) {
    const entry = entries.find((e) => e.name === key);
    if (!entry) continue;
    
    // Map the source path to the output path
    const sourcePath = entry.scriptPath;
    const outputPath = placeholderMap[key];
    
    if (sourcePath && outputPath) {
      // Store both full path and relative path variants
      map.set(sourcePath, outputPath);
      
      // Also store just the basename for matching
      const basename = sourcePath.split(/[\\/]/).pop();
      if (basename) {
        map.set(basename, outputPath);
        map.set(`./${basename}`, outputPath);
      }
      
      // Store the entry directory relative path
      const entryDir = key;
      const entryIndexPath = `${entryDir}/${basename}`;
      map.set(entryIndexPath, outputPath);
      map.set(`./${entryIndexPath}`, outputPath);
    }
  }
  
  return map;
}

function shouldUseServiceWorker(mv: 2 | 3, browser: BrowserTarget): boolean {
  return mv === 3 && browser === "chromium";
}

function isChromiumOnlyAutofillKey(key: string): boolean {
  return key === "sidepanel" || key === "newtab" || key === "bookmarks" || key === "history";
}

const fillers: Record<string, (mv: 2 | 3, browser: BrowserTarget) => FillAction> = {
  background: (mv, browser) => (out, path) => {
    const bg = (out.background as Record<string, unknown>) ?? {};
    if (shouldUseServiceWorker(mv, browser)) {
      if (isEntryFieldEmpty((bg as { service_worker?: string }).service_worker)) {
        out.background = { ...bg, service_worker: path };
      }
    } else {
      const scripts = (bg as { scripts?: string[] }).scripts;
      if (!Array.isArray(scripts) || scripts.length === 0) {
        out.background = { ...bg, scripts: [path] };
      }
    }
  },

  popup: (mv) => (out, path) => {
    if (mv === 3) {
      const action = (out.action as Record<string, unknown>) ?? {};
      if (isEntryFieldEmpty((action as { default_popup?: string }).default_popup)) {
        out.action = { ...action, default_popup: path };
      }
    } else {
      const ba = (out.browser_action as Record<string, unknown>) ?? {};
      if (isEntryFieldEmpty((ba as { default_popup?: string }).default_popup)) {
        out.browser_action = { ...ba, default_popup: path };
      }
    }
  },

  options: (mv) => (out, path) => {
    if (mv === 3) {
      const opt = (out.options_ui as Record<string, unknown>) ?? {};
      if (isEntryFieldEmpty((opt as { page?: string }).page)) {
        out.options_ui = { ...opt, page: path };
      }
    } else if (isEntryFieldEmpty((out as { options_page?: string }).options_page)) {
      (out as Record<string, unknown>).options_page = path;
    }
  },

  devtools: () => (out, path) => {
    if (isEntryFieldEmpty((out as { devtools_page?: string }).devtools_page)) {
      (out as Record<string, unknown>).devtools_page = path;
    }
  },

  sandbox: () => (out, path) => {
    const sandbox = out.sandbox;
    if (sandbox === null || typeof sandbox !== "object" || Array.isArray(sandbox)) {
      out.sandbox = { pages: [path] };
      return;
    }
    const pages = (sandbox as { pages?: unknown }).pages;
    if (!Array.isArray(pages) || pages.length === 0) {
      out.sandbox = { ...sandbox, pages: [path] };
    }
  },

  content: () => (out, path) => {
    const cs = out.content_scripts;
    if (!Array.isArray(cs) || cs.length === 0) {
      out.content_scripts = [
        { matches: ["<all_urls>"], js: [path], run_at: "document_idle" },
      ] as ManifestRecord["content_scripts"];
    }
  },

  newtab: () => (out, path) => {
    const overrides = (out.chrome_url_overrides as Record<string, unknown>) ?? {};
    if (isEntryFieldEmpty(overrides.newtab)) {
      out.chrome_url_overrides = { ...overrides, newtab: path };
    }
  },

  bookmarks: () => (out, path) => {
    const overrides = (out.chrome_url_overrides as Record<string, unknown>) ?? {};
    if (isEntryFieldEmpty(overrides.bookmarks)) {
      out.chrome_url_overrides = { ...overrides, bookmarks: path };
    }
    ensurePermission(out, "bookmarks");
  },

  history: () => (out, path) => {
    const overrides = (out.chrome_url_overrides as Record<string, unknown>) ?? {};
    if (isEntryFieldEmpty(overrides.history)) {
      out.chrome_url_overrides = { ...overrides, history: path };
    }
    ensurePermission(out, "history");
  },

  sidepanel: () => (out, path) => {
    const sp = (out.side_panel as Record<string, unknown>) ?? {};
    if (isEntryFieldEmpty((sp as { default_path?: string }).default_path)) {
      out.side_panel = { ...sp, default_path: path };
    }
  },
};

function ensurePermission(out: ManifestRecord, permission: string): void {
  const current = out.permissions;
  if (!Array.isArray(current)) {
    out.permissions = [permission];
    return;
  }
  if (!current.includes(permission)) {
    out.permissions = [...current, permission];
  }
}

function buildAutoFillers(mv: 2 | 3, browser: BrowserTarget): Record<string, FillAction> {
  const result: Record<string, FillAction> = {};
  for (const [key, factory] of Object.entries(fillers)) {
    if (key === "sidepanel" && mv !== 3) continue;
    if (browser === "firefox" && isChromiumOnlyAutofillKey(key)) continue;
    result[key] = factory(mv, browser);
  }
  return result;
}

function needsSidePanelPermission(
  out: ManifestRecord,
  placeholderMap: Record<string, string>,
  browser: BrowserTarget
): boolean {
  if (browser !== "chromium") return false;
  if (placeholderMap.sidepanel != null) return true;
  const sp = out.side_panel;
  if (sp == null || typeof sp !== "object" || Array.isArray(sp)) return false;
  const path = (sp as { default_path?: string }).default_path;
  return typeof path === "string" && path.trim() !== "";
}

function autoFillEntryFields(
  manifest: ManifestRecord,
  placeholderMap: Record<string, string>,
  browser: BrowserTarget
): ManifestRecord {
  const mv = manifest.manifest_version === 2 ? 2 : 3;
  const out: ManifestRecord = { ...manifest };
  const autoFillers = buildAutoFillers(mv, browser);

  for (const [key, path] of Object.entries(placeholderMap)) {
    autoFillers[key]?.(out, path);
  }

  if (mv === 3 && needsSidePanelPermission(out, placeholderMap, browser)) {
    ensurePermission(out, "sidePanel");
  }

  return out;
}

function replacePlaceholderInString(str: string, placeholderMap: Record<string, string>): string {
  return str.replace(ADDFOX_PLACEHOLDER_REGEX, (_, key: string) =>
    key in placeholderMap ? placeholderMap[key] : `[addfox.${key}]`
  );
}

function replacePlaceholdersInValue(value: unknown, placeholderMap: Record<string, string>): unknown {
  if (typeof value === "string") {
    return replacePlaceholderInString(value, placeholderMap);
  }
  if (Array.isArray(value)) {
    return value.map((item) => replacePlaceholdersInValue(item, placeholderMap));
  }
  if (value !== null && typeof value === "object") {
    const out: ManifestRecord = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = replacePlaceholdersInValue(v, placeholderMap);
    }
    return out;
  }
  return value;
}

/**
 * Replace source file paths in manifest with build output paths
 * This handles the case where users specify source paths like "./background.ts" in manifest
 */
function replaceSourcePathsWithOutput(
  value: unknown,
  sourceToOutputMap: Map<string, string>
): unknown {
  if (typeof value === "string") {
    // Check if this is a source file path that needs replacement
    if (isSourceFilePath(value)) {
      // Try exact match
      const outputPath = sourceToOutputMap.get(value);
      if (outputPath) return outputPath;
      
      // Try matching basename
      const basename = value.split(/[\\/]/).pop();
      if (basename) {
        const fromBasename = sourceToOutputMap.get(basename);
        if (fromBasename) return fromBasename;
        
        const fromDotSlash = sourceToOutputMap.get(`./${basename}`);
        if (fromDotSlash) return fromDotSlash;
      }
    }
    return value;
  }
  
  if (Array.isArray(value)) {
    return value.map((item) => replaceSourcePathsWithOutput(item, sourceToOutputMap));
  }
  
  if (value !== null && typeof value === "object") {
    const out: ManifestRecord = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = replaceSourcePathsWithOutput(v, sourceToOutputMap);
    }
    return out;
  }
  
  return value;
}

function resolveContentScriptsPlaceholders(
  manifest: ManifestRecord,
  placeholderMap: Record<string, string>,
  contentScriptOutput?: ContentScriptOutput
): ManifestRecord {
  const contentScripts = manifest.content_scripts;
  if (!Array.isArray(contentScripts)) return manifest;

  const defaultContentJs = placeholderMap.content ? [placeholderMap.content] : [];
  const shouldAutoFillCss = contentScriptOutput?.autoFillCssInManifest !== false;

  const resolved = contentScripts.map((item: unknown) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) return item;
    
    const obj = item as Record<string, unknown>;
    const out: Record<string, unknown> = { ...obj };

    // Resolve JS placeholders
    if (Array.isArray(obj.js)) {
      const jsReplacement = contentScriptOutput?.js ?? defaultContentJs;
      out.js = (obj.js as unknown[]).flatMap((el) =>
        (el === CONTENT_PLACEHOLDER || el === CONTENT_PLACEHOLDER_LEGACY) ? jsReplacement : [el]
      );
    }

    // Resolve CSS placeholders
    if (Array.isArray(obj.css)) {
      const cssReplacement = contentScriptOutput?.css ?? [];
      const resolvedCss = (obj.css as unknown[]).flatMap((el) =>
        (el === CONTENT_PLACEHOLDER || el === CONTENT_PLACEHOLDER_LEGACY) ? cssReplacement : [el]
      );
      if (resolvedCss.length > 0) out.css = resolvedCss;
      else delete out.css;
    }

    // Inject default JS if needed
    const hadJs = hasNonEmptyStringArray(out.js);
    const hadCss = hasNonEmptyStringArray(out.css);
    if (!hadJs && !hadCss && placeholderMap.content) {
      out.js = contentScriptOutput?.js ?? defaultContentJs;
    }

    // Auto-fill CSS
    const hasJs = hasNonEmptyStringArray(out.js);
    const isContentItem = hasJs &&
      placeholderMap.content != null &&
      (out.js as string[]).includes(placeholderMap.content);
    
    if (shouldAutoFillCss && isContentItem && contentScriptOutput?.css?.length && !hasNonEmptyStringArray(out.css)) {
      out.css = contentScriptOutput.css;
    }

    return out;
  });

  return { ...manifest, content_scripts: resolved };
}

/**
 * Replace source file paths in content_scripts with output paths
 */
function replaceContentScriptSourcePaths(
  manifest: ManifestRecord,
  sourceToOutputMap: Map<string, string>
): ManifestRecord {
  const contentScripts = manifest.content_scripts;
  if (!Array.isArray(contentScripts)) return manifest;

  const resolved = contentScripts.map((item: unknown) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) return item;
    
    const obj = item as Record<string, unknown>;
    const out: Record<string, unknown> = { ...obj };

    // Replace source paths in js array
    if (Array.isArray(obj.js)) {
      out.js = (obj.js as string[]).map((path) => {
        if (typeof path === "string" && isSourceFilePath(path)) {
          const outputPath = sourceToOutputMap.get(path);
          if (outputPath) return outputPath;
          
          // Try basename match
          const basename = path.split(/[\\/]/).pop();
          if (basename) {
            const fromBasename = sourceToOutputMap.get(basename);
            if (fromBasename) return fromBasename;
          }
        }
        return path;
      });
    }

    return out;
  });

  return { ...manifest, content_scripts: resolved };
}

function buildManifest(
  manifest: ManifestRecord,
  entries: EntryInfo[],
  browser: BrowserTarget,
  contentScriptOutput?: ContentScriptOutput
): ManifestRecord {
  const placeholderMap = buildPlaceholderMap(entries);
  const sourceToOutputMap = buildSourceToOutputMap(entries);
  
  const pipeline = [
    // Step 1: Auto-fill empty entry fields
    (m: ManifestRecord) => autoFillEntryFields(m, placeholderMap, browser),
    // Step 2: Replace [addfox.xxx] placeholders
    (m: ManifestRecord) => resolveContentScriptsPlaceholders(m, placeholderMap, contentScriptOutput),
    // Step 3: Replace source file paths with output paths
    (m: ManifestRecord) => replaceSourcePathsWithOutput(m, sourceToOutputMap) as ManifestRecord,
    // Step 4: Handle content_scripts source path replacement specifically
    (m: ManifestRecord) => replaceContentScriptSourcePaths(m, sourceToOutputMap),
    // Step 5: Legacy placeholder replacement (for backward compatibility)
    (m: ManifestRecord) => replacePlaceholdersInValue(m, placeholderMap) as ManifestRecord,
  ];

  const result = pipeline.reduce((acc, fn) => fn(acc) as ManifestRecord, { ...manifest });
  
  return isManifestRecord(result) ? result : manifest;
}

export function buildForBrowser(
  config: ManifestConfig,
  entries: EntryInfo[],
  browser: BrowserTarget,
  onWarn?: (message: string) => void,
  contentScriptOutput?: ContentScriptOutput
): ManifestRecord {
  const { manifest, warnMessage } = pickManifestForTarget(config, browser);
  if (warnMessage) onWarn?.(warnMessage);
  return buildManifest(manifest, entries, browser, contentScriptOutput);
}

export function resolveManifestChromium(
  config: ManifestConfig,
  entries: EntryInfo[]
): ManifestRecord {
  return buildForBrowser(config, entries, "chromium");
}

export function resolveManifestFirefox(
  config: ManifestConfig,
  entries: EntryInfo[]
): ManifestRecord {
  return buildForBrowser(config, entries, "firefox");
}

export function resolveManifestForTarget(
  config: ManifestConfig,
  entries: EntryInfo[],
  target: BrowserTarget,
  onWarn?: (message: string) => void,
  contentScriptOutput?: ContentScriptOutput
): ManifestRecord {
  return buildForBrowser(config, entries, target, onWarn, contentScriptOutput);
}
