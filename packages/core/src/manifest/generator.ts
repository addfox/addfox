/**
 * Manifest generator - auto-generates manifest from entrypoints
 * Follows minimum generation principle: only output necessary fields
 */

import type { EntryInfo, ManifestConfig, ManifestRecord } from "../types.ts";
import type { BrowserTarget } from "../constants.ts";
import { SCRIPT_ONLY_ENTRY_NAMES } from "../constants.ts";

/** Entry types that need specific manifest fields */
type EntryType =
  | "background"
  | "content"
  | "popup"
  | "options"
  | "devtools"
  | "sidepanel"
  | "sandbox"
  | "newtab"
  | "bookmarks"
  | "history";

/** Configuration for generating a manifest field */
interface FieldGenerator {
  /** Check if this field should be generated based on entries */
  shouldGenerate: (entries: EntryInfo[], browser: BrowserTarget, mv?: 2 | 3) => boolean;
  /** Generate the field value */
  generate: (entries: EntryInfo[], browser: BrowserTarget, mv: 2 | 3) => unknown;
  /** Required manifest version(s) for this field */
  minManifestVersion?: 2 | 3;
  maxManifestVersion?: 2 | 3;
}

/** Get entry type from entry name */
function getEntryType(entry: EntryInfo): EntryType | null {
  const name = entry.name;
  const validTypes: EntryType[] = [
    "background",
    "content",
    "popup",
    "options",
    "devtools",
    "sidepanel",
    "sandbox",
    "newtab",
    "bookmarks",
    "history",
  ];
  return validTypes.includes(name as EntryType) ? (name as EntryType) : null;
}

/** Check if entry has a script-only entry name */
function isScriptOnlyEntry(entry: EntryInfo): boolean {
  return SCRIPT_ONLY_ENTRY_NAMES.includes(entry.name as (typeof SCRIPT_ONLY_ENTRY_NAMES)[number]);
}

/** Get output path for an entry */
function getEntryOutputPath(entry: EntryInfo): string {
  if (isScriptOnlyEntry(entry)) {
    return `${entry.name}/index.js`;
  }
  return `${entry.name}/index.html`;
}

// ============================================================================
// Field Generators
// ============================================================================

/** Generate manifest_version field - always required */
const manifestVersionGenerator: FieldGenerator = {
  shouldGenerate: () => true,
  generate: (_entries, _browser, mv) => mv,
};

/** Generate name field - required, uses default if not provided */
const nameGenerator: FieldGenerator = {
  shouldGenerate: () => true,
  generate: () => "Extension",
};

/** Generate version field - required, uses default if not provided */
const versionGenerator: FieldGenerator = {
  shouldGenerate: () => true,
  generate: () => "1.0.0",
};

/** Generate background field */
const backgroundGenerator: FieldGenerator = {
  shouldGenerate: (entries) => entries.some((e) => e.name === "background"),
  generate: (entries, browser, mv) => {
    const bgEntry = entries.find((e) => e.name === "background");
    if (!bgEntry) return undefined;

    const outputPath = getEntryOutputPath(bgEntry);

    if (mv === 3) {
      // MV3: Chrome uses service_worker, Firefox uses scripts
      if (browser === "chromium") {
        return { service_worker: outputPath };
      }
      return { scripts: [outputPath] };
    }

    // MV2: always use scripts
    return { scripts: [outputPath] };
  },
  minManifestVersion: 2,
  maxManifestVersion: 3,
};

/** Generate content_scripts field */
const contentScriptsGenerator: FieldGenerator = {
  shouldGenerate: (entries) => entries.some((e) => e.name === "content"),
  generate: (entries) => {
    const contentEntry = entries.find((e) => e.name === "content");
    if (!contentEntry) return undefined;

    return [
      {
        matches: ["<all_urls>"],
        js: [getEntryOutputPath(contentEntry)],
        run_at: "document_idle",
      },
    ];
  },
  minManifestVersion: 2,
  maxManifestVersion: 3,
};

/** Generate action/browser_action field */
const actionGenerator: FieldGenerator = {
  shouldGenerate: (entries) => entries.some((e) => e.name === "popup"),
  generate: (entries, _browser, mv) => {
    const popupEntry = entries.find((e) => e.name === "popup");
    if (!popupEntry) return undefined;

    const outputPath = getEntryOutputPath(popupEntry);

    // MV3: action, MV2: browser_action
    if (mv === 3) {
      return { default_popup: outputPath };
    }
    return { default_popup: outputPath };
  },
  minManifestVersion: 2,
  maxManifestVersion: 3,
};

/** Generate options_ui/options_page field */
const optionsGenerator: FieldGenerator = {
  shouldGenerate: (entries) => entries.some((e) => e.name === "options"),
  generate: (entries, _browser, mv) => {
    const optionsEntry = entries.find((e) => e.name === "options");
    if (!optionsEntry) return undefined;

    const outputPath = getEntryOutputPath(optionsEntry);

    if (mv === 3) {
      return { page: outputPath, open_in_tab: true };
    }
    return outputPath; // MV2: options_page is a string
  },
  minManifestVersion: 2,
  maxManifestVersion: 3,
};

/** Generate devtools_page field */
const devtoolsGenerator: FieldGenerator = {
  shouldGenerate: (entries) => entries.some((e) => e.name === "devtools"),
  generate: (entries) => {
    const devtoolsEntry = entries.find((e) => e.name === "devtools");
    if (!devtoolsEntry) return undefined;
    return getEntryOutputPath(devtoolsEntry);
  },
  minManifestVersion: 2,
  maxManifestVersion: 3,
};

/** Generate side_panel field (MV3 Chromium only) */
const sidepanelGenerator: FieldGenerator = {
  shouldGenerate: (entries, browser) =>
    browser === "chromium" && entries.some((e) => e.name === "sidepanel"),
  generate: (entries) => {
    const sidepanelEntry = entries.find((e) => e.name === "sidepanel");
    if (!sidepanelEntry) return undefined;
    return { default_path: getEntryOutputPath(sidepanelEntry) };
  },
  minManifestVersion: 3,
  maxManifestVersion: 3,
};

/** Generate sandbox field */
const sandboxGenerator: FieldGenerator = {
  shouldGenerate: (entries) => entries.some((e) => e.name === "sandbox"),
  generate: (entries) => {
    const sandboxEntry = entries.find((e) => e.name === "sandbox");
    if (!sandboxEntry) return undefined;
    return { pages: [getEntryOutputPath(sandboxEntry)] };
  },
  minManifestVersion: 2,
  maxManifestVersion: 3,
};

/** Generate chrome_url_overrides field */
const overridesGenerator: FieldGenerator = {
  shouldGenerate: (entries) =>
    entries.some((e) => ["newtab", "bookmarks", "history"].includes(e.name)),
  generate: (entries) => {
    const overrides: Record<string, string> = {};

    for (const entry of entries) {
      if (["newtab", "bookmarks", "history"].includes(entry.name)) {
        overrides[entry.name] = getEntryOutputPath(entry);
      }
    }

    return Object.keys(overrides).length > 0 ? overrides : undefined;
  },
  minManifestVersion: 2,
  maxManifestVersion: 3,
};

/** Generate permissions field based on entries */
const permissionsGenerator: FieldGenerator = {
  shouldGenerate: (entries: EntryInfo[], browser: BrowserTarget, mv?: 2 | 3) => {
    // Generate if we have entries that need permissions
    const hasBookmarks = entries.some((e) => e.name === "bookmarks");
    const hasHistory = entries.some((e) => e.name === "history");
    const hasSidepanel = entries.some((e) => e.name === "sidepanel");

    return (
      hasBookmarks ||
      hasHistory ||
      (hasSidepanel && browser === "chromium" && mv === 3)
    );
  },
  generate: (entries: EntryInfo[], browser: BrowserTarget, mv: 2 | 3) => {
    const permissions: string[] = [];

    if (entries.some((e) => e.name === "bookmarks")) {
      permissions.push("bookmarks");
    }
    if (entries.some((e) => e.name === "history")) {
      permissions.push("history");
    }
    if (
      entries.some((e) => e.name === "sidepanel") &&
      browser === "chromium" &&
      mv === 3
    ) {
      permissions.push("sidePanel");
    }

    return permissions.length > 0 ? permissions : undefined;
  },
  minManifestVersion: 2,
  maxManifestVersion: 3,
};

// ============================================================================
// Manifest Generation
// ============================================================================

/** All field generators in order */
const fieldGenerators: Record<string, FieldGenerator> = {
  manifest_version: manifestVersionGenerator,
  name: nameGenerator,
  version: versionGenerator,
  background: backgroundGenerator,
  content_scripts: contentScriptsGenerator,
  action: actionGenerator,
  browser_action: actionGenerator,
  options_ui: optionsGenerator,
  options_page: optionsGenerator,
  devtools_page: devtoolsGenerator,
  side_panel: sidepanelGenerator,
  sandbox: sandboxGenerator,
  chrome_url_overrides: overridesGenerator,
  permissions: permissionsGenerator,
};

/** Field name mapping based on manifest version */
function getFieldNameForVersion(
  baseName: string,
  mv: 2 | 3
): string | null {
  const mvMappings: Record<string, Record<2 | 3, string | null>> = {
    action: { 2: "browser_action", 3: "action" },
    browser_action: { 2: "browser_action", 3: null }, // MV3 doesn't use browser_action
    options_ui: { 2: null, 3: "options_ui" }, // MV2 uses options_page
    options_page: { 2: "options_page", 3: null },
    side_panel: { 2: null, 3: "side_panel" }, // MV3 only
  };

  const mapping = mvMappings[baseName];
  if (mapping) {
    return mapping[mv];
  }
  return baseName;
}

/** Check if a value is empty (needs auto-fill) */
function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

/** Generate a minimal manifest from entries */
export function generateManifestFromEntries(
  entries: EntryInfo[],
  browser: BrowserTarget,
  mv: 2 | 3 = 3
): ManifestRecord {
  const manifest: ManifestRecord = {};

  // Always add manifest_version
  manifest.manifest_version = mv;

  // Always add required fields with defaults
  manifest.name = "Extension";
  manifest.version = "1.0.0";

  // Generate optional fields based on entries
  for (const [baseName, generator] of Object.entries(fieldGenerators)) {
    // Skip base required fields (already added)
    if (["manifest_version", "name", "version"].includes(baseName)) continue;

    // Check manifest version compatibility
    if (generator.minManifestVersion && mv < generator.minManifestVersion) continue;
    if (generator.maxManifestVersion && mv > generator.maxManifestVersion) continue;

    // Get the correct field name for this manifest version
    const fieldName = getFieldNameForVersion(baseName, mv);
    if (!fieldName) continue;

    // Check if should generate
    if (!generator.shouldGenerate(entries, browser, mv)) continue;

    // Generate the field value
    const value = generator.generate(entries, browser, mv);
    if (value !== undefined) {
      manifest[fieldName] = value;
    }
  }

  return manifest;
}

/** Auto-fill missing required fields in an existing manifest */
export function autoFillManifestFields(
  manifest: ManifestRecord,
  entries: EntryInfo[],
  browser: BrowserTarget
): ManifestRecord {
  const mv = (manifest.manifest_version as 2 | 3) ?? 3;
  const result: ManifestRecord = { ...manifest };

  // Ensure manifest_version
  if (isEmptyValue(result.manifest_version)) {
    result.manifest_version = mv;
  }

  // Ensure name
  if (isEmptyValue(result.name)) {
    result.name = "Extension";
  }

  // Ensure version
  if (isEmptyValue(result.version)) {
    result.version = "1.0.0";
  }

  // Auto-fill entry-related fields
  for (const [baseName, generator] of Object.entries(fieldGenerators)) {
    // Skip base required fields (already handled)
    if (["manifest_version", "name", "version"].includes(baseName)) continue;

    // Check manifest version compatibility
    if (generator.minManifestVersion && mv < generator.minManifestVersion) continue;
    if (generator.maxManifestVersion && mv > generator.maxManifestVersion) continue;

    // Get the correct field name for this manifest version
    const fieldName = getFieldNameForVersion(baseName, mv);
    if (!fieldName) continue;

    // Check if field is empty and should be auto-filled
    const currentValue = result[fieldName];
    const shouldFill = isEmptyValue(currentValue) && generator.shouldGenerate(entries, browser, mv);

    if (shouldFill) {
      const value = generator.generate(entries, browser, mv);
      if (value !== undefined) {
        result[fieldName] = value;
      }
    }
  }

  // Handle special case: side_panel needs sidePanel permission in MV3 Chromium
  if (
    mv === 3 &&
    browser === "chromium" &&
    result.side_panel != null &&
    !isEmptyValue(result.side_panel)
  ) {
    const perms = (result.permissions as string[]) ?? [];
    if (!perms.includes("sidePanel")) {
      result.permissions = [...perms, "sidePanel"];
    }
  }

  // Handle bookmarks/history permissions
  const overrides = result.chrome_url_overrides as Record<string, string> | undefined;
  if (overrides) {
    const perms = (result.permissions as string[]) ?? [];
    const newPerms = [...perms];

    if (overrides.bookmarks && !perms.includes("bookmarks")) {
      newPerms.push("bookmarks");
    }
    if (overrides.history && !perms.includes("history")) {
      newPerms.push("history");
    }

    if (newPerms.length > perms.length) {
      result.permissions = newPerms;
    }
  }

  return result;
}

/** Check if manifest has all required fields */
export function hasRequiredFields(manifest: ManifestRecord): boolean {
  return (
    !isEmptyValue(manifest.manifest_version) &&
    !isEmptyValue(manifest.name) &&
    !isEmptyValue(manifest.version)
  );
}

/** Generate a complete manifest config with browser variants */
export function generateManifestConfig(
  entries: EntryInfo[],
  browser: BrowserTarget,
  mv: 2 | 3 = 3
): ManifestConfig {
  return generateManifestFromEntries(entries, browser, mv);
}

/** Merge user manifest with auto-generated fields */
export function mergeWithGeneratedManifest(
  userManifest: ManifestRecord,
  entries: EntryInfo[],
  browser: BrowserTarget
): ManifestRecord {
  const mv = (userManifest.manifest_version as 2 | 3) ?? 3;

  // First auto-fill any missing required fields
  const filled = autoFillManifestFields(userManifest, entries, browser);

  // Then generate a fresh manifest from entries
  const generated = generateManifestFromEntries(entries, browser, mv);

  // Merge: user values take precedence, but we add any missing entry fields
  const result: ManifestRecord = { ...filled };

  // For entry-related fields, if user hasn't specified them, use generated
  const entryFields = [
    "background",
    "content_scripts",
    "action",
    "browser_action",
    "options_ui",
    "options_page",
    "devtools_page",
    "side_panel",
    "sandbox",
    "chrome_url_overrides",
  ];

  for (const field of entryFields) {
    if (isEmptyValue(result[field]) && !isEmptyValue(generated[field])) {
      result[field] = generated[field];
    }
  }

  // Merge permissions (union of user and auto-generated)
  const userPerms = new Set<string>(Array.isArray(result.permissions) ? (result.permissions as string[]) : []);
  const genPerms = new Set<string>(Array.isArray(generated.permissions) ? (generated.permissions as string[]) : []);

  // Add auto-generated permissions that aren't already present
  for (const perm of genPerms) {
    userPerms.add(perm);
  }

  if (userPerms.size > 0) {
    result.permissions = Array.from(userPerms);
  }

  return result;
}
