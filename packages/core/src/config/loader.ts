/**
 * Config loading - resolves addfox configuration
 */

import { createRequire } from "module";
import { resolve } from "path";
import { existsSync, statSync } from "fs";
import type { AddfoxUserConfig, AddfoxResolvedConfig, EntryInfo, ManifestRecord, ManifestConfig, ManifestPathConfig } from "../types.ts";
import {
  CONFIG_FILES,
  DEFAULT_OUT_DIR,
  DEFAULT_APP_DIR,
  DEFAULT_ENV_PREFIXES,
  ADDFOX_OUTPUT_ROOT,
  RSTEST_CONFIG_FILES,
} from "../constants.ts";
import { AddfoxError, ADDFOX_ERROR_CODES } from "@addfox/common";
import { discoverEntries, type EntryDiscovererOptions } from "../entry/discoverer.ts";
import { resolveEntries, type EntryResolverOptions } from "../entry/resolver.ts";
import { resolveManifestInput, ManifestLoader } from "../manifest/loader.ts";
import {
  generateManifestFromEntries,
  autoFillManifestFields,
  mergeWithGeneratedManifest,
  hasRequiredFields,
} from "../manifest/generator.ts";
import { logDoneTimed, logEntriesTable, warn } from "@addfox/common";

export interface ConfigResolutionResult {
  config: AddfoxResolvedConfig;
  baseEntries: EntryInfo[];
  entries: EntryInfo[];
}

export interface ConfigLoaderOptions {
  configFiles?: readonly string[];
  entryDiscovererOptions?: EntryDiscovererOptions;
  entryResolverOptions?: EntryResolverOptions;
}

const require = createRequire(
  typeof __filename !== "undefined" ? __filename : import.meta.url
);

function loadWithJiti(root: string, configPath: string): unknown {
  const isConfigRestart = process.env.ADDFOX_CONFIG_RESTART === "1";
  const jitiOptions: Record<string, unknown> = { esmResolve: true };
  
  if (isConfigRestart) {
    jitiOptions.moduleCache = false;
    jitiOptions.requireCache = false;
  }
  
  const jitiFn = require("jiti")(root, jitiOptions) as (path: string) => unknown;
  return jitiFn(configPath);
}

function loadNativeJs(configPath: string): unknown {
  const mod = require(configPath) as { default?: unknown } | undefined;
  return mod?.default ?? mod;
}

function unwrapConfig(mod: unknown): AddfoxUserConfig {
  if (mod == null) return {} as AddfoxUserConfig;
  
  if (typeof mod === "object" && "default" in mod && mod.default !== undefined) {
    return (mod.default ?? {}) as AddfoxUserConfig;
  }
  
  return (mod ?? {}) as AddfoxUserConfig;
}

function loadConfigModule(root: string, configPath: string, file: string): AddfoxUserConfig {
  const isNativeJs = file.endsWith(".js") || file.endsWith(".mjs");
  
  if (isNativeJs) {
    try {
      return unwrapConfig(loadNativeJs(configPath));
    } catch {
      // Fall back to jiti for ESM .js or other edge cases
    }
  }
  
  return unwrapConfig(loadWithJiti(root, configPath));
}

function findConfigFile(root: string, configFiles: readonly string[]): string | null {
  for (const file of configFiles) {
    const p = resolve(root, file);
    if (existsSync(p)) return p;
  }
  return null;
}

function loadConfigAtPath(root: string, configPath: string, file: string): AddfoxUserConfig {
  try {
    return loadConfigModule(root, configPath, file);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new AddfoxError({
      code: ADDFOX_ERROR_CODES.CONFIG_LOAD_FAILED,
      message: "Failed to load config file",
      details: `File: ${configPath}, error: ${message}`,
      hint: "Check addfox.config syntax and dependencies",
      cause: e instanceof Error ? e : undefined,
    });
  }
}

export function loadConfigFile(
  root: string,
  configFiles: readonly string[] = CONFIG_FILES
): AddfoxUserConfig | null {
  for (const file of configFiles) {
    const p = resolve(root, file);
    if (!existsSync(p)) continue;
    return loadConfigAtPath(root, p, file);
  }
  return null;
}

export function getResolvedConfigFilePath(
  root: string,
  configFiles: readonly string[] = CONFIG_FILES
): string | null {
  return findConfigFile(root, configFiles);
}

function resolveAppDir(root: string, userConfig: AddfoxUserConfig): string {
  return resolve(root, userConfig.appDir ?? DEFAULT_APP_DIR);
}

function validateAppDir(appDir: string, entryDisabled: boolean): void {
  if (entryDisabled) return;
  if (!existsSync(appDir) || !statSync(appDir).isDirectory()) {
    throw new AddfoxError({
      code: ADDFOX_ERROR_CODES.APP_DIR_MISSING,
      message: "App directory not found",
      details: `Missing appDir: ${appDir}`,
      hint: "Create the directory or set appDir to an existing folder (default is app/)",
    });
  }
}

function createResolvedConfig(
  userConfig: AddfoxUserConfig,
  root: string,
  appDir: string,
  manifest: NonNullable<AddfoxResolvedConfig["manifest"]>
): AddfoxResolvedConfig {
  return {
    ...userConfig,
    manifest,
    appDir,
    outDir: userConfig.outDir ?? DEFAULT_OUT_DIR,
    envPrefix: userConfig.envPrefix ?? [...DEFAULT_ENV_PREFIXES],
    outputRoot: ADDFOX_OUTPUT_ROOT,
    root,
  };
}

function discoverAndResolveEntries(
  userConfig: AddfoxUserConfig,
  root: string,
  appDir: string,
  manifest: ManifestRecord | null,
  entryDiscovererOptions?: EntryDiscovererOptions,
  entryResolverOptions?: EntryResolverOptions
): { baseEntries: EntryInfo[]; entries: EntryInfo[] } {
  const baseEntries = discoverEntries(appDir, entryDiscovererOptions);
  const result = resolveEntries(userConfig, root, appDir, manifest ?? undefined, entryResolverOptions);
  return { baseEntries, entries: result.entries };
}

/**
 * Type guard for ChromiumFirefoxManifest
 */
function isChromiumFirefoxManifest(config: ManifestConfig): config is { chromium?: ManifestRecord; firefox?: ManifestRecord } {
  return typeof config === "object" && config !== null && ("chromium" in config || "firefox" in config);
}

/**
 * Type guard for ManifestRecord
 */
function isManifestRecord(config: ManifestConfig): config is ManifestRecord {
  return typeof config === "object" && config !== null && !isChromiumFirefoxManifest(config);
}

/**
 * Check if user manifest needs auto-fill (missing required fields)
 */
function needsAutoFill(manifest: ManifestConfig): boolean {
  if (isChromiumFirefoxManifest(manifest)) {
    const chromiumNeedsFill = !manifest.chromium || 
      !(manifest.chromium as ManifestRecord).manifest_version;
    const firefoxNeedsFill = !manifest.firefox || 
      !(manifest.firefox as ManifestRecord).manifest_version;
    return chromiumNeedsFill || firefoxNeedsFill;
  }
  return !(manifest as ManifestRecord).manifest_version;
}

/**
 * Resolve or generate manifest from entries.
 * Priority:
 * 1. User-provided manifest (highest priority)
 * 2. Manifest files in appDir/manifest/
 * 3. Auto-generated from entries (if no manifest found and entries exist)
 */
function resolveOrGenerateManifest(
  userManifest: ManifestConfig | ManifestPathConfig | undefined,
  root: string,
  appDir: string,
  entries: EntryInfo[],
  browser: "chromium" | "firefox" = "chromium"
): { manifest: ManifestConfig; wasAutoGenerated: boolean } {
  // Check if user provided inline manifest that needs auto-fill
  // (skip file loading to avoid validation errors on incomplete manifests)
  const needsAutoFill = (config: ManifestConfig): boolean => {
    if (!config || typeof config !== "object") return false;
    // ChromiumFirefoxManifest format
    if ("chromium" in config || "firefox" in config) {
      const cf = config as { chromium?: ManifestRecord; firefox?: ManifestRecord };
      const chromiumNeedsFill = cf.chromium && !cf.chromium.manifest_version;
      const firefoxNeedsFill = cf.firefox && !cf.firefox.manifest_version;
      return !!(chromiumNeedsFill || firefoxNeedsFill);
    }
    // Single manifest format
    return !(config as ManifestRecord).manifest_version;
  };
  
  const skipFileLoading = userManifest && needsAutoFill(userManifest);

  // Try to load user-provided manifest first (unless we need to skip)
  const userManifestResult = skipFileLoading 
    ? (userManifest as ManifestConfig)
    : resolveManifestInput(userManifest, root, appDir);
  
  if (userManifestResult) {
    // User provided a manifest - auto-fill any missing required fields
    if (isChromiumFirefoxManifest(userManifestResult)) {
      // ChromiumFirefoxManifest format
      const result: { chromium?: ManifestRecord; firefox?: ManifestRecord } = {};
      
      if (userManifestResult.chromium && Object.keys(userManifestResult.chromium).length > 0) {
        const filled = autoFillManifestFields(
          userManifestResult.chromium as ManifestRecord,
          entries,
          "chromium"
        );
        result.chromium = filled;
      }
      
      if (userManifestResult.firefox && Object.keys(userManifestResult.firefox).length > 0) {
        const filled = autoFillManifestFields(
          userManifestResult.firefox as ManifestRecord,
          entries,
          "firefox"
        );
        result.firefox = filled;
      }
      
      // If only one browser is specified, auto-generate the other
      if (result.chromium && !result.firefox) {
        const mv = (result.chromium.manifest_version as 2 | 3) ?? 3;
        result.firefox = generateManifestFromEntries(entries, "firefox", mv);
        warn("Auto-generated Firefox manifest from Chromium manifest");
      } else if (result.firefox && !result.chromium) {
        const mv = (result.firefox.manifest_version as 2 | 3) ?? 3;
        result.chromium = generateManifestFromEntries(entries, "chromium", mv);
        warn("Auto-generated Chromium manifest from Firefox manifest");
      }
      
      return { manifest: result, wasAutoGenerated: false };
    }
    
    // Single manifest object
    const userRecord = userManifestResult as ManifestRecord;
    const filled = autoFillManifestFields(userRecord, entries, browser);
    
    // Log warnings for auto-filled fields
    const missingFields: string[] = [];
    if (!userRecord.name) missingFields.push("name");
    if (!userRecord.version) missingFields.push("version");
    if (!userRecord.manifest_version) missingFields.push("manifest_version");
    
    if (missingFields.length > 0) {
      warn(`Auto-filled missing manifest fields: ${missingFields.join(", ")}`);
    }
    
    return { manifest: filled, wasAutoGenerated: false };
  }
  
  // No user manifest found - auto-generate from entries
  if (entries.length === 0) {
    throw new AddfoxError({
      code: ADDFOX_ERROR_CODES.MANIFEST_MISSING,
      message: "Manifest config or file not found, and no entries to auto-generate from",
      details:
        "Configure manifest in addfox.config, place manifest.json under appDir or appDir/manifest, or create entry directories (background/, content/, popup/, etc.)",
      hint:
        "Option 1: manifest: { name, version, ... } in addfox.config; Option 2: manifest.json under appDir; Option 3: Create entry directories and let addfox auto-generate the manifest",
    });
  }
  
  // Auto-generate manifest from entries (default to MV3)
  const generated = generateManifestFromEntries(entries, browser, 3);
  
  warn("Auto-generated manifest from entrypoints (no manifest.json found)");
  warn(`Generated manifest name: "${generated.name}", version: "${generated.version}"`);
  
  return { manifest: generated, wasAutoGenerated: true };
}

export function resolveAddfoxConfig(
  root: string,
  options: ConfigLoaderOptions = {}
): ConfigResolutionResult {
  const t0 = performance.now();
  
  // Load config file
  const userConfig = loadConfigFile(root, options.configFiles);
  if (!userConfig) {
    throw new AddfoxError({
      code: ADDFOX_ERROR_CODES.CONFIG_NOT_FOUND,
      message: "Addfox config file not found",
      details: `No addfox.config.ts, addfox.config.js or addfox.config.mjs found under ${root}`,
      hint: "Run the command from project root or create addfox.config.ts / addfox.config.js",
    });
  }
  
  // Resolve paths
  const appDir = resolveAppDir(root, userConfig);
  const entryDisabled = userConfig.entry === false;
  
  // Validate
  validateAppDir(appDir, entryDisabled);
  
  // Get browser target from options (default to chromium)
  const browser = options.entryResolverOptions?.browser ?? "chromium";
  
  // Step 1: Discover entries first (needed for manifest generation)
  const baseEntries = entryDisabled ? [] : discoverEntries(appDir, options.entryDiscovererOptions);
  
  // Step 2: Resolve or generate manifest (uses discovered entries)
  const { manifest, wasAutoGenerated } = entryDisabled
    ? { manifest: (userConfig.manifest ?? { manifest_version: 3, name: "Extension", version: "1.0.0" }) as ManifestConfig, wasAutoGenerated: false }
    : resolveOrGenerateManifest(userConfig.manifest, root, appDir, baseEntries, browser);
  
  // Step 3: Create resolved config
  const config = createResolvedConfig(userConfig, root, appDir, manifest);
  
  // Step 4: Final entry resolution with the resolved manifest
  const manifestForEntry = typeof manifest === "object" && manifest !== null
    ? ((manifest as { chromium?: ManifestRecord; firefox?: ManifestRecord }).chromium ?? 
       (manifest as { chromium?: ManifestRecord; firefox?: ManifestRecord }).firefox ?? 
       manifest as ManifestRecord)
    : null;
  
  const { entries } = entryDisabled
    ? { entries: [] }
    : discoverAndResolveEntries(
        userConfig,
        root,
        appDir,
        manifestForEntry,
        options.entryDiscovererOptions,
        options.entryResolverOptions
      );
  
  if (!entryDisabled && entries.length === 0) {
    throw new AddfoxError({
      code: ADDFOX_ERROR_CODES.NO_ENTRIES,
      message: "No entries discovered",
      details: `No background, content, popup, options or sidepanel entry found under ${appDir}`,
      hint: "At least one such directory with index.ts / index.js etc. is required",
    });
  }
  
  // Log results
  logDoneTimed("Parse config", Math.round(performance.now() - t0));
  logEntriesTable(entries, { root });
  
  return { config, baseEntries, entries };
}

export function clearConfigCache(configFilePath: string): void {
  try {
    delete require.cache[configFilePath];
  } catch {
    // ignore
  }
  
  for (const key of Object.keys(require.cache)) {
    const mod = require.cache[key] as { filename?: string } | undefined;
    if (mod?.filename === configFilePath) {
      try {
        delete require.cache[key];
      } catch {
        // ignore
      }
    }
  }
}

export function getResolvedRstestConfigFilePath(root: string): string | null {
  for (const file of RSTEST_CONFIG_FILES) {
    const p = resolve(root, file);
    if (existsSync(p)) return p;
  }
  return null;
}
