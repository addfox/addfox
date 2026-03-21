import type { RsbuildConfig } from "@rsbuild/core";
import type { EntryRowBase } from "@addfox/common";
import type { BrowserTarget, CliCommand } from "./constants.ts";
import type { PipelineContext } from "./pipeline/types.js";

/** Browser executable paths for dev mode (addfox.config browserPath option) */
export interface BrowserPathConfig {
  chrome?: string;
  chromium?: string;
  edge?: string;
  brave?: string;
  vivaldi?: string;
  opera?: string;
  santa?: string;
  arc?: string;
  yandex?: string;
  browseros?: string;
  /** Required when launch target is "custom" */
  custom?: string;
  firefox?: string;
}

/** Single manifest as JSON object (nested unknown allowed) */
export type ManifestRecord = Record<string, unknown>;

/** Manifest config with chromium/firefox branches */
export interface ChromiumFirefoxManifest {
  chromium?: ManifestRecord;
  firefox?: ManifestRecord;
}

/** Manifest config: single object or per-browser branches */
export type ManifestConfig = ManifestRecord | ChromiumFirefoxManifest;

/**
 * Manifest path config: addfox.config can set chromium/firefox to manifest file paths,
 * relative to appDir. E.g. chromium: 'app/manifest/manifest.json'
 */
export type ManifestPathConfig = {
  chromium?: string;
  firefox?: string;
};

/**
 * Helpers passed to rsbuild when it is a function.
 * Use merge(base, overrides) for the same deep-merge effect as object form.
 */
export interface RsbuildConfigHelpers {
  merge: (base: RsbuildConfig, user: RsbuildConfig) => RsbuildConfig;
}

/** User ext config */
export interface AddfoxUserConfig {
  /**
   * Extension manifest: object config, path config (relative to appDir), or omit to auto-read
   * manifest.json / manifest.chromium.json / manifest.firefox.json from appDir.
   */
  manifest?: ManifestConfig | ManifestPathConfig;
  /** Rsbuild plugins array; use function calls like Vite, e.g. plugins: [vue()] */
  plugins?: RsbuildConfig["plugins"];
  /**
   * Override/extend Rsbuild config (like Vite's build.rollupOptions / esbuild).
   * Object: deep-merge with base.
   * Function: (base, helpers) => config; use helpers.merge(base, overrides) for deep-merge effect.
   */
  rsbuild?:
    | RsbuildConfig
    | ((
        base: RsbuildConfig,
        helpers?: RsbuildConfigHelpers
      ) => RsbuildConfig | Promise<RsbuildConfig>);
  /**
   * Custom entries: key = entry name (reserved: popup/options/sidepanel/background/devtools/content; others custom),
   * value = path relative to baseDir (baseDir = app/ when appDir unset, else baseDir = appDir).
   * Omit to discover background/content/popup/options/sidepanel/devtools from baseDir.
   * Set to **false** to disable framework entry handling: no discovery, no plugin-extension-entry;
   * only debug, hotReload, manifest, plugins, appDir, outDir are used; configure entry in rsbuild.
   */
  entry?: Record<string, EntryConfigValue> | false;
  /** App directory; default app/. Also the lookup base for entry paths (app/ or appDir). */
  appDir?: string;
  /**
   * Output directory name under .addfox (e.g. "extension" �?output at .addfox/extension). Default "extension".
   */
  outDir?: string;
  /**
   * When true or omitted, `addfox build` packs the output directory into a zip file at `.addfox/<outDir>.zip`.
   * Set to false to disable zip output.
   */
  zip?: boolean;
  /**
   * Prefixes for env vars loaded from .env to inject into client (e.g. background/content).
   * Passed to Rsbuild loadEnv; default `['ADDFOX_PUBLIC_']` only exposes ADDFOX_PUBLIC_* vars.
   * Non-public vars like ADDFOX_SECRET are not injected into runtime bundles.
   */
  envPrefix?: string[];
  /**
   * Browser executable paths for dev mode. Framework uses these to start Chrome/Firefox when running `addfox dev`.
   * If unset, dev mode uses default OS paths (see plugin-extension-hmr). Chrome is launched via chrome-launcher.
   */
  browserPath?: BrowserPathConfig;
  /**
   * Cache chromium-based user data dir between dev runs.
   * Default true; CLI -c/--cache has higher priority.
   */
  cache?: boolean;
  /**
   * Hot-reload (WebSocket) options for dev. Port defaults to 23333.
   * Set to false to disable; true or object to enable (object allows port/autoRefreshContentPage).
   */
  hotReload?:
    | {
        /** HMR WebSocket server port; default 23333 */
        port?: number;
        /** When true, content entry change triggers reload manager to refresh the active tab. Default is false. */
        autoRefreshContentPage?: boolean;
      }
    | boolean;
  /**
   * When true and running in dev (`addfox dev`), enables the error monitor (plugin-extension-monitor).
   * Default false. Only has effect in dev; build ignores this.
   */
  debug?: boolean;
  /**
   * When true, enables Rsdoctor build report (RSDOCTOR=true). Build/dev will open analysis page after build.
   * When object, passes options to RsdoctorRspackPlugin (see https://rsdoctor.rs/config/options/options).
   * Default false. CLI -r/--report overrides to true when enabled.
   */
  report?: boolean | RsdoctorReportOptions;
}

/** Resolved config with root, appDir, outDir; manifest is resolved to object form */
export interface AddfoxResolvedConfig extends Omit<AddfoxUserConfig, "manifest"> {
  manifest: ManifestConfig;
  appDir: string;
  outDir: string;
  /** Parent folder for build output (always ".addfox"). */
  outputRoot: string;
  root: string;
  /** When false, framework does not add plugin-extension-entry; user configures entry in rsbuild */
  entry?: Record<string, EntryConfigValue> | false;
  /** Passed to Rsbuild loadEnv; default `['ADDFOX_PUBLIC_']` only exposes ADDFOX_PUBLIC_* */
  envPrefix?: string[];
  /** Hot-reload options for dev; port defaults to 23333. false = disabled, true or object = enabled. */
  hotReload?: { port?: number; autoRefreshContentPage?: boolean } | boolean;
}

/** Entry config value: string path or structured { src, html } */
export type EntryConfigValue =
  | string
  | {
      /** JS/TS entry path (relative to baseDir) */
      src: string;
      /**
       * HTML generation toggle or template path.
       * - true: generate HTML without a template
       * - false: script-only entry
       * - string: HTML template path (relative to baseDir)
       */
      html?: boolean | string;
    };

/** Where to inject the entry script in HTML (for entries discovered via data-addfox-entry). */
export type ScriptInjectPosition = "head" | "body";

/**
 * Options for RsdoctorRspackPlugin when report is object.
 * @see https://rsdoctor.rs/config/options/options
 */
export interface RsdoctorReportOptions {
  mode?: "brief" | "normal" | "lite";
  output?: {
    reportDir?: string;
    mode?: "brief" | "normal";
    options?: Record<string, unknown>;
    reportCodeType?: string | Record<string, boolean>;
    [key: string]: unknown;
  };
  disableClientServer?: boolean;
  port?: number;
  features?: unknown;
  linter?: unknown;
  supports?: unknown;
  brief?: unknown;
  experiments?: { enableNativePlugin?: boolean; [key: string]: unknown };
  [key: string]: unknown;
}

/** Discovered entry info */
export interface EntryInfo extends EntryRowBase {
  htmlPath?: string;
  /** Whether this entry should generate an HTML page (template optional). */
  html?: boolean;
  /** When set, template must omit the data-addfox-entry script and rsbuild html.inject should use this. */
  scriptInject?: ScriptInjectPosition;
  /** When true, output path follows script/html path (e.g. main.ts �?main.js, scripts/main.ts �?scripts/main.js). */
  outputFollowsScriptPath?: boolean;
}

/** Entry with name + absolute path for HMR reload manager */
export type ReloadManagerEntry = { name: string; path: string };
