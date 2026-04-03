import { existsSync, readFileSync } from "fs";
import { resolve } from 'path';
import { pathToFileURL } from "url";
import type { RsbuildConfig, RsbuildPlugin, RsbuildPluginAPI } from '@rsbuild/core';
import { mergeRsbuildConfig } from '@rsbuild/core';
import { HookManager } from '@addfox/common';
import { createRequire } from "module";
import type { PipelineContext, AddfoxResolvedConfig, EntryInfo, LaunchTarget } from '@addfox/core';
import { warn } from "@addfox/common";
import { AddfoxError, ADDFOX_ERROR_CODES } from "@addfox/common";
import {
  resolveAddfoxConfig,
  getManifestRecordForTarget,
  HMR_WS_PORT,
  toReloadManagerEntries,
  getBrowserOutputDir,
} from "@addfox/core";
import { Pipeline as CorePipeline } from '@addfox/core/pipeline';
import { hmrPlugin, type HmrPluginOptions } from '@addfox/rsbuild-plugin-extension-hmr';
import { getMissingPackages, getAddCommand, detectFromLockfile } from '@addfox/pkg-manager';
import { buildFrameworkPluginList } from './frameworkPlugins.js';
import { rspack } from '@rspack/core';

type LoosePlugin = RsbuildConfig['plugins'] extends (infer P)[] ? P : never;
type RuntimeEnvConfig = {
  define: Record<string, string>;
  processEnvBase: Record<string, string>;
  backgroundPrivateEnv: Record<string, string>;
};

export interface PipelineOptions {
  root: string;
  command: 'dev' | 'build';
  browser: 'chromium' | 'firefox';
  launch: LaunchTarget;
  cache: boolean;
  report: boolean | Record<string, unknown>;
  /** When true, enable error monitor in dev; CLI --debug overrides config.debug */
  debug?: boolean;
  /** When false, do not auto-open browser. */
  open?: boolean;
  /** Pre-loaded config to avoid double loading */
  config?: AddfoxResolvedConfig;
  baseEntries?: EntryInfo[];
  entries?: EntryInfo[];
}

/**
 * CLI-specific pipeline implementation
 */
export class Pipeline {
  private hookManager: HookManager<Record<string, PipelineContext>>;
  private corePipeline: CorePipeline;
  private options: PipelineOptions;

  constructor(options: PipelineOptions) {
    this.options = options;
    this.hookManager = new HookManager<Record<string, PipelineContext>>();
    this.corePipeline = new CorePipeline(this.hookManager);
    this.registerDefaultHooks();
  }

  /**
   * Get the hook manager for registering additional hooks
   */
  get hooks(): HookManager<Record<string, PipelineContext>> {
    return this.hookManager;
  }

  /**
   * Execute the build process
   */
  async run(): Promise<PipelineContext> {
    return this.corePipeline.execute(this.options.root, []);
  }

  /**
   * Register default build hooks
   */
  private registerDefaultHooks(): void {
    // Load stage: load config and entries (use pre-loaded if available)
    this.hookManager.register('load', 'after', async (ctx) => {
      if (this.options.config) {
        ctx.config = this.options.config;
        ctx.baseEntries = this.options.baseEntries ?? [];
        ctx.entries = this.options.entries ?? [];
      } else {
        const result = resolveAddfoxConfig(ctx.root);
        ctx.config = result.config;
        ctx.baseEntries = result.baseEntries;
        ctx.entries = result.entries;
      }
    });

    // Resolve stage: build context from options (CLI overrides config)
    this.hookManager.register('resolve', 'after', async (ctx) => {
      ctx.command = this.options.command;
      ctx.browser = this.options.browser;
      ctx.cache = this.options.cache;
      ctx.report = this.options.report;
      ctx.isDev = this.options.command === 'dev';
      // Use browser-specific output subdirectory: .addfox/extension/extension-chromium or extension-firefox
      const browserSubDir = getBrowserOutputDir(ctx.browser);
      ctx.distPath = resolve(ctx.root, ctx.config.outputRoot, ctx.config.outDir, browserSubDir);

      if (this.options.debug !== undefined) {
        ctx.config = { ...ctx.config, debug: this.options.debug };
      }

      // Warn about deprecated MV2 for Chromium
      if (ctx.browser === 'chromium') {
        const record = getManifestRecordForTarget(ctx.config.manifest, ctx.browser);
        if (record?.manifest_version === 2) {
          warn('Warning: MV2 has been deprecated for Chrome. Please use MV3.');
        }
      }
    });

    // Build stage: build Rsbuild config
    this.hookManager.register('build', 'after', async (ctx) => {
      ctx.rsbuild = await this.buildRsbuildConfig(ctx);
    });
  }

  private async buildRsbuildConfig(ctx: PipelineContext): Promise<RsbuildConfig> {
    const base = this.buildBaseRsbuildConfig(ctx);
    const userConfig = await this.resolveUserRsbuildConfig(base, ctx.config);
    
    let merged = mergeRsbuildConfig(base, userConfig);
    
    if (ctx.isDev) {
      const hmrOverrides = this.buildHmrOverrides(ctx);
      if (hmrOverrides) {
        merged = mergeRsbuildConfig(merged, hmrOverrides);
      }
    }
    
    if (ctx.report) {
      merged = await this.mergeRsdoctorPlugin(merged, ctx.root, ctx.config.outputRoot, ctx.report);
    }
    
    return merged;
  }

  private buildBaseRsbuildConfig(ctx: PipelineContext): RsbuildConfig {
    const runtimeEnvConfig = buildRuntimeEnvConfig(ctx.config, ctx.browser, ctx.root, ctx.isDev);
    const plugins = buildFrameworkPluginList(ctx);
    const scopedProcessEnvPlugin = createScopedProcessEnvPlugin(
      runtimeEnvConfig.processEnvBase,
      runtimeEnvConfig.backgroundPrivateEnv
    );
    if (scopedProcessEnvPlugin) plugins.push(scopedProcessEnvPlugin as LoosePlugin);

    // In dev mode, use SourceMapDevToolPlugin to exclude third-party source maps.
    // The strategy is to generate source maps only for project entry files and exclude vendor chunks.
    const rspackPlugins = ctx.isDev
      ? [
          // Source maps for project files only, excluding vendor chunks
          new rspack.SourceMapDevToolPlugin({
            filename: null,
            append: '\n//# sourceMappingURL=[url]',
            test: /\.(js|jsx|ts|tsx|mjs|cjs)$/,
            exclude: [/vendor/, /node_modules/, /shared-vendor/],
            module: true,
            columns: true,
          }),
        ]
      : [];

    return {
      root: ctx.root,
      plugins,
      source: {
        define: runtimeEnvConfig.define,
      },
      output: {
        legalComments: 'none',
        // Disable the default source map in dev mode and use SourceMapDevToolPlugin instead
        sourceMap: false,
      },
      tools: {
        rspack: {
          plugins: rspackPlugins,
        },
      },
    };
  }

  private async resolveUserRsbuildConfig(
    base: RsbuildConfig,
    config: AddfoxResolvedConfig
  ): Promise<RsbuildConfig> {
    const user = config.rsbuild;
    if (typeof user === 'function') {
      return user(base, { merge: mergeRsbuildConfig });
    }
    return (user && typeof user === 'object') ? user : {};
  }

  private buildHmrOverrides(ctx: PipelineContext): RsbuildConfig | undefined {
    const hotReload = ctx.config.hotReload;
    const hotReloadEnabled = hotReload !== false;
    const hotReloadOpts = typeof hotReload === 'object' && hotReload !== null ? hotReload : undefined;
    const isConfigRestart = process.env.ADDFOX_CONFIG_RESTART === '1';
    const reloadManagerEntries = toReloadManagerEntries(ctx.entries, ctx.root);

    // User-defined browser paths from addfox.config (optional overrides)
    const browserPathConfig = ctx.config.browserPath ?? {};

    const hmrOpts: HmrPluginOptions = {
      distPath: ctx.distPath,
      autoOpen: !isConfigRestart && (this.options.open !== false),
      browser: this.options.launch,
      debug: ctx.config.debug,
      root: ctx.root,
      outputRoot: ctx.config.outputRoot,
      chromePath: browserPathConfig.chrome,
      chromiumPath: browserPathConfig.chromium,
      edgePath: browserPathConfig.edge,
      bravePath: browserPathConfig.brave,
      vivaldiPath: browserPathConfig.vivaldi,
      operaPath: browserPathConfig.opera,
      santaPath: browserPathConfig.santa,
      arcPath: browserPathConfig.arc,
      yandexPath: browserPathConfig.yandex,
      browserosPath: browserPathConfig.browseros,
      customPath: browserPathConfig.custom,
      firefoxPath: browserPathConfig.firefox,
      cache: ctx.cache,
      wsPort: hotReloadOpts?.port ?? HMR_WS_PORT,
      enableReload: hotReloadEnabled,
      autoRefreshContentPage: hotReloadEnabled ? (hotReloadOpts?.autoRefreshContentPage ?? true) : false,
      reloadManagerEntries,
    };

    const useRsbuildClientHmr = ctx.browser !== 'firefox' && hotReloadEnabled;
    const devConfig = useRsbuildClientHmr
      ? {
          hmr: true,
          client: { protocol: 'ws' as const, host: '127.0.0.1', port: '<port>', path: '/rsbuild-hmr' },
          liveReload: true,
          writeToDisk: true,
        }
      : {
          hmr: false,
          liveReload: false,
          writeToDisk: true,
        };

    return {
      dev: devConfig,
      server: { printUrls: false, cors: { origin: '*' } },
      plugins: [hmrPlugin(hmrOpts) as LoosePlugin],
    };
  }

  private async mergeRsdoctorPlugin(
    config: RsbuildConfig,
    root: string,
    outputRoot: string,
    reportOption: true | Record<string, unknown>
  ): Promise<RsbuildConfig> {
    const missing = getMissingPackages(root, ['@rsdoctor/rspack-plugin']);
    if (missing.length > 0) {
      const pm = detectFromLockfile(root);
      const cmd = getAddCommand(pm, missing.join(' '), true);
      throw new AddfoxError({
        code: ADDFOX_ERROR_CODES.RSDOCTOR_NOT_INSTALLED,
        message: "Rsdoctor plugin not installed",
        details: "report (-r/--report or config.report) requires @rsdoctor/rspack-plugin",
        hint: `Install with: ${cmd}`,
      });
    }

    const reportDir = resolve(root, outputRoot, 'report');
    const require = createRequire(import.meta.url);
    const rsdoctorEntry = require.resolve("@rsdoctor/rspack-plugin", { paths: [root] });
    const { RsdoctorRspackPlugin } = await import(pathToFileURL(rsdoctorEntry).href);
    const tools = config.tools as { rspack?: { plugins?: unknown[] } } | undefined;
    const existing = tools?.rspack?.plugins ?? [];
    
    const pluginOptions = reportOption === true
      ? { output: { reportDir }, mode: 'brief' as const }
      : { ...(reportOption as Record<string, unknown>), output: { ...(reportOption as { output?: Record<string, unknown> }).output, reportDir } };

    const rsdoctorPlugin = new RsdoctorRspackPlugin(pluginOptions);

    return mergeRsbuildConfig(config, {
      tools: { rspack: { plugins: [...existing, rsdoctorPlugin] } },
    } as RsbuildConfig);
  }
}

function getManifestVersionValue(config: AddfoxResolvedConfig, browser: 'chromium' | 'firefox'): string {
  const manifestRecord = getManifestRecordForTarget(config.manifest, browser);
  const mv = manifestRecord?.manifest_version;
  if (typeof mv === "number" || typeof mv === "string") return String(mv);
  return "";
}

export function buildRuntimeEnvDefine(
  config: AddfoxResolvedConfig,
  browser: 'chromium' | 'firefox',
  root: string,
  isDev: boolean
): Record<string, string> {
  return buildRuntimeEnvConfig(config, browser, root, isDev).define;
}

function buildRuntimeEnvConfig(
  config: AddfoxResolvedConfig,
  browser: 'chromium' | 'firefox',
  root: string,
  isDev: boolean
): RuntimeEnvConfig {
  const mode = isDev ? "development" : "production";
  const fileEnv = loadDotEnvByMode(root, mode);
  const mergedEnv = { ...fileEnv, ...process.env };
  const envPrefixes = getLoadEnvPrefixes(config);
  const publicEnv = pickPublicEnvVars(mergedEnv, envPrefixes);
  const backgroundPrivateEnv = pickBackgroundPrivateEnvVars(mergedEnv, envPrefixes);
  const manifestVersion = getManifestVersionValue(config, browser);
  const importMetaEnv = {
    ...publicEnv,
    MODE: mode,
    DEV: isDev,
    PROD: !isDev,
    BROWSER: browser,
    MANIFEST_VERSION: manifestVersion,
  };
  const processEnvForBundle = {
    NODE_ENV: mode,
    BROWSER: browser,
    MANIFEST_VERSION: manifestVersion,
    ...publicEnv,
  };

  return {
    define: {
      "process.env": "globalThis.__ADDFOX_PROCESS_ENV__",
      "import.meta.env": JSON.stringify(importMetaEnv),
      "import.meta.env.BROWSER": JSON.stringify(browser),
      "import.meta.env.MANIFEST_VERSION": JSON.stringify(manifestVersion),
    },
    processEnvBase: processEnvForBundle,
    backgroundPrivateEnv,
  };
}

export function getLoadEnvPrefixes(config: AddfoxResolvedConfig): string[] {
  return config.envPrefix ?? ["ADDFOX_PUBLIC_"];
}

function pickPublicEnvVars(
  env: Record<string, string | undefined>,
  prefixes: string[]
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value !== "string") continue;
    if (!prefixes.some((prefix) => key.startsWith(prefix))) continue;
    result[key] = value;
  }
  return result;
}

function pickBackgroundPrivateEnvVars(
  env: Record<string, string | undefined>,
  publicPrefixes: string[]
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value !== "string") continue;
    if (!key.startsWith("ADDFOX_")) continue;
    if (publicPrefixes.some((prefix) => key.startsWith(prefix))) continue;
    result[key] = value;
  }
  return result;
}

function createScopedProcessEnvPlugin(
  processEnvBase: Record<string, string>,
  privateEnv: Record<string, string>
): RsbuildPlugin | undefined {
  if (Object.keys(processEnvBase).length === 0) return undefined;

  return {
    name: "addfox-scoped-process-env",
    setup(api: RsbuildPluginAPI) {
      api.modifyRsbuildConfig((config) => {
        const source = config.source ?? {};
        const entry = source.entry as Record<string, string | { import: string | string[]; html?: boolean }> | undefined;
        if (!entry) return;

        const nextEntry = { ...entry };
        const scopedEnvByEntry = buildScopedEnvByEntry(
          Object.keys(entry),
          processEnvBase,
          privateEnv
        );
        for (const [entryName, entryValue] of Object.entries(entry)) {
          const scopedEnv = scopedEnvByEntry[entryName] ?? processEnvBase;
          const snippet = buildScopedProcessEnvSnippet(scopedEnv);
          const prepend = `data:text/javascript,${encodeURIComponent(snippet)}`;
          nextEntry[entryName] = prependDataModule(entryValue, prepend);
        }

        config.source = { ...source, entry: nextEntry };
      });
    },
  };
}

export function buildScopedEnvByEntry(
  entryNames: string[],
  processEnvBase: Record<string, string>,
  privateEnv: Record<string, string>
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  for (const entryName of entryNames) {
    result[entryName] = entryName === "background"
      ? { ...processEnvBase, ...privateEnv }
      : { ...processEnvBase };
  }
  return result;
}

function buildScopedProcessEnvSnippet(processEnv: Record<string, string>): string {
  const envJson = JSON.stringify(processEnv);
  return `
const addfoxScopedEnv = ${envJson};
if (!globalThis.__ADDFOX_PROCESS_ENV__) {
  globalThis.__ADDFOX_PROCESS_ENV__ = {};
}
Object.assign(globalThis.__ADDFOX_PROCESS_ENV__, addfoxScopedEnv);
`;
}

function prependDataModule(
  entryValue: string | { import: string | string[]; html?: boolean },
  prependModule: string
): { import: string | string[]; html?: boolean } {
  if (typeof entryValue === "string") {
    return { import: [prependModule, entryValue] };
  }
  if (Array.isArray(entryValue.import)) {
    return { ...entryValue, import: [prependModule, ...entryValue.import] };
  }
  return { ...entryValue, import: [prependModule, entryValue.import] };
}

function loadDotEnvByMode(root: string, mode: "development" | "production"): Record<string, string> {
  const result: Record<string, string> = {};
  const files = [".env", ".env.local", `.env.${mode}`, `.env.${mode}.local`];

  for (const file of files) {
    const path = resolve(root, file);
    if (!existsSync(path)) continue;
    const parsed = parseDotEnv(readFileSync(path, "utf-8"));
    Object.assign(result, parsed);
  }

  return result;
}

function parseDotEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    const rawValue = trimmed.slice(eq + 1).trim();
    result[key] = stripQuotes(rawValue);
  }

  return result;
}

function stripQuotes(value: string): string {
  if (value.length < 2) return value;
  const quote = value[0];
  if ((quote !== '"' && quote !== "'") || value[value.length - 1] !== quote) return value;
  return value.slice(1, -1);
}

/**
 * Run pipeline with given options
 */
export async function runPipeline(
  options: PipelineOptions
): Promise<PipelineContext> {
  const pipeline = new Pipeline(options);
  return pipeline.run();
}
