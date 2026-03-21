/**
 * Config loading - resolves addfox configuration
 */

import { createRequire } from "module";
import { resolve } from "path";
import { existsSync, statSync } from "fs";
import type { AddfoxUserConfig, AddfoxResolvedConfig, EntryInfo, ManifestRecord } from "../types.ts";
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
import { resolveManifestInput } from "../manifest/loader.ts";
import { logDoneTimed, logEntriesTable } from "@addfox/common";

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
  
  // Resolve manifest
  const manifest = resolveManifestInput(userConfig.manifest, root, appDir);
  if (!manifest) {
    throw new AddfoxError({
      code: ADDFOX_ERROR_CODES.MANIFEST_MISSING,
      message: "Manifest config or file not found",
      details:
        "Configure manifest in addfox.config, or place manifest.json / manifest.chromium.json / manifest.firefox.json under appDir or appDir/manifest",
      hint:
        "Option 1: manifest: { name, version, ... } in addfox.config; Option 2: manifest.json under appDir or appDir/manifest; Option 3: manifest: { chromium: 'path/to/manifest.json' } (path relative to appDir)",
    });
  }
  
  // Create resolved config
  const config = createResolvedConfig(userConfig, root, appDir, manifest);
  
  // Discover and resolve entries
  // Extract the actual manifest record for the target browser (default to chromium)
  const manifestForEntry = typeof manifest === "object" && manifest !== null
    ? ((manifest as { chromium?: ManifestRecord; firefox?: ManifestRecord }).chromium ?? 
       (manifest as { chromium?: ManifestRecord; firefox?: ManifestRecord }).firefox ?? 
       manifest as ManifestRecord)
    : null;
  
  const { baseEntries, entries } = entryDisabled
    ? { baseEntries: [], entries: [] }
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
