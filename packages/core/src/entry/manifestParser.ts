/**
 * Manifest entry parser - extracts entry paths from manifest.json
 * Allows users to specify source file paths directly in manifest fields
 */

import type { ManifestRecord, EntryConfigValue } from "../types.ts";
import type { BrowserTarget } from "../constants.ts";
import { MANIFEST_ENTRY_PATHS, MANIFEST_ENTRY_KEYS } from "../constants.ts";

type EntryKey = keyof typeof MANIFEST_ENTRY_PATHS;

interface ExtractedEntry {
  name: string;
  value: EntryConfigValue;
  /** Original manifest field path, used for later replacement */
  manifestPath: string;
}

interface ParsedEntryFromManifest {
  entries: Record<string, EntryConfigValue>;
  /** Maps manifest field paths to entry names for replacement */
  replacementMap: Map<string, string>;
}

/** Whether the path is a source file path (not a build output path) */
function isSourceFilePath(path: string): boolean {
  const lower = path.trim().toLowerCase();
  return /\.(ts|tsx|js|jsx)$/.test(lower) && !lower.includes("/dist/") && !lower.includes("\\dist\\");
}

/** Extract entry name from path */
function inferEntryNameFromPath(path: string): string | null {
  const cleanPath = path.replace(/^\.\/|^\//, "");
  const firstSegment = cleanPath.split(/[\/\\]/)[0];
  
  if (MANIFEST_ENTRY_KEYS.includes(firstSegment as EntryKey)) {
    return firstSegment;
  }
  return null;
}

/** Extract service_worker path */
function extractServiceWorker(
  manifest: ManifestRecord,
  browser: BrowserTarget
): ExtractedEntry | null {
  const bg = manifest.background as Record<string, unknown> | undefined;
  if (!bg) return null;

  // MV3: service_worker
  const serviceWorker = bg.service_worker;
  if (typeof serviceWorker === "string" && isSourceFilePath(serviceWorker)) {
    const entryName = inferEntryNameFromPath(serviceWorker) ?? "background";
    return {
      name: entryName,
      value: serviceWorker.replace(/^\.\//, ""),
      manifestPath: "background.service_worker",
    };
  }

  // MV2: scripts array
  const scripts = bg.scripts;
  if (Array.isArray(scripts) && scripts.length > 0) {
    const firstScript = scripts[0];
    if (typeof firstScript === "string" && isSourceFilePath(firstScript)) {
      const entryName = inferEntryNameFromPath(firstScript) ?? "background";
      return {
        name: entryName,
        value: firstScript.replace(/^\.\//, ""),
        manifestPath: "background.scripts[0]",
      };
    }
  }

  // MV2: page
  const page = bg.page;
  if (typeof page === "string" && isSourceFilePath(page)) {
    const entryName = inferEntryNameFromPath(page) ?? "background";
    return {
      name: entryName,
      value: page.replace(/^\.\//, ""),
      manifestPath: "background.page",
    };
  }

  return null;
}

/** Extract action.default_popup or browser_action.default_popup path */
function extractPopup(
  manifest: ManifestRecord,
  browser: BrowserTarget
): ExtractedEntry | null {
  const mv = manifest.manifest_version === 2 ? 2 : 3;
  
  let popupPath: string | undefined;
  let manifestPath: string | undefined;

  if (mv === 3) {
    const action = manifest.action as Record<string, unknown> | undefined;
    const defaultPopup = action?.default_popup;
    if (typeof defaultPopup === "string") {
      popupPath = defaultPopup;
      manifestPath = "action.default_popup";
    }
  } else {
    const browserAction = manifest.browser_action as Record<string, unknown> | undefined;
    const defaultPopup = browserAction?.default_popup;
    if (typeof defaultPopup === "string") {
      popupPath = defaultPopup;
      manifestPath = "browser_action.default_popup";
    }
  }

  if (popupPath && isSourceFilePath(popupPath)) {
    const entryName = inferEntryNameFromPath(popupPath) ?? "popup";
    return {
      name: entryName,
      value: popupPath.replace(/^\.\//, ""),
      manifestPath: manifestPath!,
    };
  }

  return null;
}

/** Extract options_page or options_ui.page path */
function extractOptions(manifest: ManifestRecord): ExtractedEntry | null {
  const mv = manifest.manifest_version === 2 ? 2 : 3;
  
  let optionsPath: string | undefined;
  let manifestPath: string | undefined;

  if (mv === 3) {
    const optionsUi = manifest.options_ui as Record<string, unknown> | undefined;
    const page = optionsUi?.page;
    if (typeof page === "string") {
      optionsPath = page;
      manifestPath = "options_ui.page";
    }
  } else {
    const optionsPage = manifest.options_page;
    if (typeof optionsPage === "string") {
      optionsPath = optionsPage;
      manifestPath = "options_page";
    }
  }

  if (optionsPath && isSourceFilePath(optionsPath)) {
    const entryName = inferEntryNameFromPath(optionsPath) ?? "options";
    return {
      name: entryName,
      value: optionsPath.replace(/^\.\//, ""),
      manifestPath: manifestPath!,
    };
  }

  return null;
}

/** Extract devtools_page path */
function extractDevtools(manifest: ManifestRecord): ExtractedEntry | null {
  const devtoolsPage = manifest.devtools_page;
  if (typeof devtoolsPage === "string" && isSourceFilePath(devtoolsPage)) {
    const entryName = inferEntryNameFromPath(devtoolsPage) ?? "devtools";
    return {
      name: entryName,
      value: devtoolsPage.replace(/^\.\//, ""),
      manifestPath: "devtools_page",
    };
  }
  return null;
}

/** Extract side_panel.default_path */
function extractSidepanel(manifest: ManifestRecord): ExtractedEntry | null {
  const sidePanel = manifest.side_panel as Record<string, unknown> | undefined;
  const defaultPath = sidePanel?.default_path;
  
  if (typeof defaultPath === "string" && isSourceFilePath(defaultPath)) {
    const entryName = inferEntryNameFromPath(defaultPath) ?? "sidepanel";
    return {
      name: entryName,
      value: defaultPath.replace(/^\.\//, ""),
      manifestPath: "side_panel.default_path",
    };
  }
  return null;
}

/** Extract sandbox.pages path */
function extractSandbox(manifest: ManifestRecord): ExtractedEntry | null {
  const sandbox = manifest.sandbox as Record<string, unknown> | undefined;
  const pages = sandbox?.pages;
  
  if (Array.isArray(pages) && pages.length > 0) {
    const firstPage = pages[0];
    if (typeof firstPage === "string" && isSourceFilePath(firstPage)) {
      const entryName = inferEntryNameFromPath(firstPage) ?? "sandbox";
      return {
        name: entryName,
        value: firstPage.replace(/^\.\//, ""),
        manifestPath: "sandbox.pages[0]",
      };
    }
  }
  return null;
}

/** Extract chrome_url_overrides paths */
function extractOverrides(manifest: ManifestRecord): ExtractedEntry[] {
  const entries: ExtractedEntry[] = [];
  const overrides = manifest.chrome_url_overrides as Record<string, unknown> | undefined;
  
  if (!overrides) return entries;

  const overrideKeys = ["newtab", "bookmarks", "history"] as const;
  
  for (const key of overrideKeys) {
    const path = overrides[key];
    if (typeof path === "string" && isSourceFilePath(path)) {
      const entryName = inferEntryNameFromPath(path) ?? key;
      entries.push({
        name: entryName,
        value: path.replace(/^\.\//, ""),
        manifestPath: `chrome_url_overrides.${key}`,
      });
    }
  }
  
  return entries;
}

/** Extract source file paths from content_scripts */
function extractContentScripts(manifest: ManifestRecord): ExtractedEntry | null {
  const contentScripts = manifest.content_scripts;
  if (!Array.isArray(contentScripts) || contentScripts.length === 0) {
    return null;
  }

  /** Find first content script that includes a source file path */
  for (let i = 0; i < contentScripts.length; i++) {
    const cs = contentScripts[i] as Record<string, unknown>;
    const js = cs.js;
    
    if (Array.isArray(js) && js.length > 0) {
      for (let j = 0; j < js.length; j++) {
        const path = js[j];
        if (typeof path === "string" && isSourceFilePath(path)) {
          const entryName = inferEntryNameFromPath(path) ?? "content";
          return {
            name: entryName,
            value: path.replace(/^\.\//, ""),
            manifestPath: `content_scripts[${i}].js[${j}]`,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Extract all entry config from manifest.
 * Only extracts fields that specify source file paths (.ts/.tsx/.js/.jsx).
 */
export function extractEntriesFromManifest(
  manifest: ManifestRecord,
  browser: BrowserTarget
): ParsedEntryFromManifest {
  const entries: Record<string, EntryConfigValue> = {};
  const replacementMap = new Map<string, string>();

  const extractors = [
    () => extractServiceWorker(manifest, browser),
    () => extractPopup(manifest, browser),
    () => extractOptions(manifest),
    () => extractDevtools(manifest),
    () => extractSidepanel(manifest),
    () => extractSandbox(manifest),
    () => extractContentScripts(manifest),
    () => extractOverrides(manifest),
  ];

  for (const extractor of extractors) {
    const result = extractor();
    if (result) {
      if (Array.isArray(result)) {
        for (const entry of result) {
          entries[entry.name] = entry.value;
          replacementMap.set(entry.manifestPath, entry.name);
        }
      } else {
        entries[result.name] = result.value;
        replacementMap.set(result.manifestPath, result.name);
      }
    }
  }

  return { entries, replacementMap };
}

/**
 * Check whether the manifest contains any source file paths.
 */
export function hasManifestSourcePaths(manifest: ManifestRecord): boolean {
  const tempBrowser: BrowserTarget = "chromium";
  const { entries } = extractEntriesFromManifest(manifest, tempBrowser);
  return Object.keys(entries).length > 0;
}

export type { ParsedEntryFromManifest, ExtractedEntry };
