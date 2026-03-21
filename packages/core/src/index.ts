/**
 * @addfox/core - Core build logic for Addfox
 * 
 * Responsibilities:
 * - Build orchestration (Pipeline)
 * - Config loading and resolution
 * - Entry discovery and resolution
 * - Manifest building and loading
 * - Type definitions and constants
 */

// Config
export { defineConfig } from "./config/defineConfig.js";
export {
  resolveAddfoxConfig,
  loadConfigFile,
  getResolvedConfigFilePath,
  getResolvedRstestConfigFilePath,
  clearConfigCache,
} from "./config/loader.js";
export type {
  ConfigResolutionResult,
  ConfigLoaderOptions,
} from "./config/loader.js";

// Pipeline
export { Pipeline } from "./pipeline/Pipeline.js";
export type { 
  PipelineContext, 
  PipelineStage,
  PipelineHook 
} from "./pipeline/types.js";

// Entry
export {
  discoverEntries,
  getHtmlEntryNames,
  getScriptOnlyEntryNames,
  getAllEntryNames,
} from "./entry/discoverer.js";
export type { EntryDiscovererOptions } from "./entry/discoverer.js";
export { resolveEntries, extractEntriesFromManifest } from "./entry/resolver.js";
export type { EntryResolverOptions, EntryResolutionResult } from "./entry/resolver.js";
export type { ParsedEntryFromManifest, ExtractedEntry } from "./entry/manifestParser.js";
export {
  parseAddfoxEntryFromHtml,
  getScriptInjectIfMatches,
  resolveScriptFromHtmlStrict,
  isScriptSrcRelative,
} from "./entry/html.js";
export type { AddfoxEntryScriptResult } from "./entry/html.js";

// Manifest
export {
  buildForBrowser,
  resolveManifestChromium,
  resolveManifestFirefox,
  resolveManifestForTarget,
  getManifestRecordForTarget,
} from "./manifest/builder.js";
export type { ContentScriptOutput } from "./manifest/builder.js";
export {
  resolveManifestInput,
  ManifestLoader,
} from "./manifest/loader.js";
export type { ManifestValidationTarget } from "./manifest/loader.js";

// Constants
export {
  DEFAULT_OUT_DIR,
  DEFAULT_APP_DIR,
  DEFAULT_ENV_PREFIXES,
  ADDFOX_OUTPUT_ROOT,
  HMR_WS_PORT,
  DEFAULT_BROWSER,
  SUPPORTED_BROWSERS,
  SUPPORTED_LAUNCH_TARGETS,
  CLI_COMMANDS,
  RSTEST_CONFIG_FILES,
  MANIFEST_ENTRY_PATHS,
  MANIFEST_ENTRY_KEYS,
  MANIFEST_DIR,
  MANIFEST_FILE_NAMES,
  CONFIG_FILES,
  SCRIPT_EXTS,
  HTML_ENTRY_NAMES,
  SCRIPT_ONLY_ENTRY_NAMES,
  RELOAD_MANAGER_ENTRY_NAMES,
  RESERVED_ENTRY_NAMES,
  BROWSER_OUTPUT_PREFIX,
  getBrowserOutputDir,
} from "./constants.js";

export { toReloadManagerEntries } from "./reloadManager.js";

// Version
export { getAddfoxVersion } from "./version.js";

// Framework detection (for debug output)
export {
  detectFrontendFramework,
  type FrontendFramework,
} from "./frameworkDetect.js";

// Types
export type {
  AddfoxUserConfig,
  AddfoxResolvedConfig,
  ManifestConfig,
  ManifestRecord,
  ChromiumFirefoxManifest,
  ManifestPathConfig,
  BrowserPathConfig,
  RsbuildConfigHelpers,
  EntryInfo,
  ReloadManagerEntry,
  ScriptInjectPosition,
  RsdoctorReportOptions,
} from "./types.js";

export type {
  BrowserTarget,
  CliCommand,
  LaunchTarget,
  EntryKey,
  ChromiumLaunchTarget,
} from "./constants.js";
