/**
 * Framework-level constants shared by config, discover, manifest, cli, etc.
 * Some behaviour can be overridden via AddfoxUserConfig or env vars.
 */

/** Supported config file names (priority order) */
export const CONFIG_FILES = ["addfox.config.ts", "addfox.config.js", "addfox.config.mjs"] as const;

/** Entry script extensions (.js preferred when both exist) */
export const SCRIPT_EXTS = [".js", ".jsx", ".ts", ".tsx"] as const;

/** Reserved entry names (not user-renamable): popup, options, sidepanel, offscreen, sandbox, newtab, bookmarks, history, background, devtools, content */
export const RESERVED_ENTRY_NAMES = [
  "popup",
  "options",
  "sidepanel",
  "offscreen",
  "sandbox",
  "newtab",
  "bookmarks",
  "history",
  "background",
  "devtools",
  "content",
] as const;

/** Entry names that require HTML (popup, options, sidepanel, devtools, offscreen, sandbox, newtab, bookmarks, history) */
export const HTML_ENTRY_NAMES = [
  "popup",
  "options",
  "sidepanel",
  "devtools",
  "offscreen",
  "sandbox",
  "newtab",
  "bookmarks",
  "history",
] as const;

/** Script-only entry names (background, content) */
export const SCRIPT_ONLY_ENTRY_NAMES = ["background", "content"] as const;

/**
 * Entry names that participate in HMR reload manager (WS-only reload).
 * Same set as SCRIPT_ONLY_ENTRY_NAMES; single source of truth for pipeline and plugin-hmr.
 */
export const RELOAD_MANAGER_ENTRY_NAMES = new Set<string>(SCRIPT_ONLY_ENTRY_NAMES);

/** Parent dir for build output (path is outputRoot/outDir; avoids root dist being scanned by Tailwind v4 etc.) */
export const ADDFOX_OUTPUT_ROOT = ".addfox";

/** Default output dir name under outputRoot (user can override via outDir) */
export const DEFAULT_OUT_DIR = "extension";

/** Default app directory (relative to project root) */
export const DEFAULT_APP_DIR = "app";

/** Default env prefixes exposed to extension runtime (only public vars) */
export const DEFAULT_ENV_PREFIXES = ["ADDFOX_PUBLIC_"] as const;

/** Dev mode HMR WebSocket port */
export const HMR_WS_PORT = 23333;

/** Default build target browser (manifest target) */
export const DEFAULT_BROWSER = "chromium" as const;

/** Supported build targets for -t/--target and manifest selection */
export const SUPPORTED_BROWSERS = ["chromium", "firefox"] as const;

export type BrowserTarget = (typeof SUPPORTED_BROWSERS)[number];

/** Browser-specific output subdirectory prefix */
export const BROWSER_OUTPUT_PREFIX = "extension" as const;

/**
 * Get browser-specific output subdirectory name.
 * Returns "extension-chromium" or "extension-firefox" based on browser target.
 */
export function getBrowserOutputDir(browser: BrowserTarget): string {
  return `${BROWSER_OUTPUT_PREFIX}-${browser}`;
}

/** Supported browsers for CLI --browser and config.browserPath paths */
export const SUPPORTED_LAUNCH_TARGETS = [
  "chrome",
  "chromium",
  "edge",
  "brave",
  "vivaldi",
  "opera",
  "santa",
  "arc",
  "yandex",
  "browseros",
  "custom",
  "firefox",
] as const;

export type LaunchTarget = (typeof SUPPORTED_LAUNCH_TARGETS)[number];

/** CLI commands */
export const CLI_COMMANDS = ["dev", "build", "test"] as const;

export type CliCommand = (typeof CLI_COMMANDS)[number];

/** Rstest config file names (resolution order per https://rstest.rs/guide/basic/configure-rstest) */
export const RSTEST_CONFIG_FILES = [
  "rstest.config.cts",
  "rstest.config.mts",
  "rstest.config.cjs",
  "rstest.config.js",
  "rstest.config.ts",
  "rstest.config.mjs",
] as const;

/** Manifest subdir under appDir (second lookup: appDir/manifest/) */
export const MANIFEST_DIR = "manifest";

/** Manifest file names auto-read under appDir (base shared; chromium/firefox override) */
export const MANIFEST_FILE_NAMES = {
  base: "manifest.json",
  chromium: "manifest.chromium.json",
  firefox: "manifest.firefox.json",
} as const;

/** Output paths per entry in manifest (relative to outDir); key is placeholder [addfox.xxx] name */
export const MANIFEST_ENTRY_PATHS = {
  background: "background/index.js",
  content: "content/index.js",
  popup: "popup/index.html",
  options: "options/index.html",
  sidepanel: "sidepanel/index.html",
  devtools: "devtools/index.html",
  offscreen: "offscreen/index.html",
  sandbox: "sandbox/index.html",
  newtab: "newtab/index.html",
  bookmarks: "bookmarks/index.html",
  history: "history/index.html",
} as const;

/** Placeholder [addfox.xxx] key; must match MANIFEST_ENTRY_PATHS keys */
export type EntryKey = keyof typeof MANIFEST_ENTRY_PATHS;

/** Runtime list of entry keys (for placeholder replacement iteration) */
export const MANIFEST_ENTRY_KEYS: readonly EntryKey[] = Object.keys(
  MANIFEST_ENTRY_PATHS
) as EntryKey[];

/** Chromium-family only (excludes firefox); used for HMR etc. */
export type ChromiumLaunchTarget = Exclude<LaunchTarget, "firefox">;
