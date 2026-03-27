#!/usr/bin/env node
import { resolve } from "path";
import { existsSync, watch } from "fs";
import { runPipeline, type PipelineOptions } from "./pipeline/index.ts";
import { getLoadEnvPrefixes } from "./pipeline/Pipeline.ts";
import { parseCliArgs } from "./cli/index.ts";
import {
  wrapAddfoxOutput,
  getRawWrites,
  setOutputPrefixRsbuild,
  setOutputPrefixAddfox,
  zipDist,
  getVersion,
  getRsbuildVersion,
  getDistSizeSync,
  formatBytes,
  isSourceMapEnabled,
  getBuildOutputSize,
} from "./utils/index.ts";
import { runTest } from "./commands/index.ts";
import {
  log,
  logDone,
  logDoneTimed,
  logDoneWithValue,
  setAddfoxLoggerRawWrites,
  error,
  formatError,
  exitWithError,
  AddfoxError,
  ADDFOX_ERROR_CODES,
} from "@addfox/common";
import {
  CONFIG_FILES,
  getResolvedConfigFilePath,
  clearConfigCache,
  resolveAddfoxConfig,
} from "@addfox/core";
import type { PipelineContext, AddfoxResolvedConfig, BrowserTarget, LaunchTarget } from "@addfox/core";
import { launchBrowserOnly, startWebSocketServer, isChromiumBrowser, type DebugServerOpts, type WsServerMode } from "@addfox/rsbuild-plugin-extension-hmr";
import { HMR_WS_PORT } from "@addfox/core";

const root = process.cwd();

/** ANSI light purple for Rsbuild branding (256 color 141). */
const PURPLE = "\x1b[38;5;141m";
const RESET = "\x1b[0m";

function hasConfigFile(): boolean {
  return CONFIG_FILES.some((file) => existsSync(resolve(root, file)));
}

function printHelp(): void {
  const version = getVersion();
  console.log(`
  addfox v${version}

  Build tool for browser extensions

  Usage:
    addfox <command> [options]

  Commands:
    dev                        Start development server with HMR
    build                      Build for production
    test                       Run tests with rstest (unit + optional E2E); forwards args to rstest

  Options:
    -b, --browser <browser>    Target/launch browser (chromium | firefox | chrome | edge | brave | ...)
    -c, --cache                Cache browser profile between launches
    --no-cache                 Disable browser profile cache for current run
    -r, --report               Enable Rsdoctor build report (opens analysis after build)
    --no-open                  Do not auto-open browser (dev/build)
    --debug                    Enable debug mode
    --help                     Show this help message
    --version                  Show version number
`);
}

// ─── Resolve options from CLI args and config ───

interface ResolvedCliOptions {
  /** Manifest/build target: chromium vs firefox (from -b/--browser, normalized by parser). */
  browser: BrowserTarget;
  /** Which executable to launch in dev (chrome/edge/brave/firefox/...); distinct from browser. */
  launch: LaunchTarget;
  cache: boolean;
  report: boolean | Record<string, unknown>;
  debug: boolean;
  /** When false, do not auto-open browser. */
  open: boolean;
}

function resolveOptions(argv: string[], config: AddfoxResolvedConfig): ResolvedCliOptions {
  const parsed = parseCliArgs(argv);
  // Parser maps -b/--browser into both: browser = chromium|firefox, launch = chrome|edge|firefox|...
  // (e.g. -b edge => browser=chromium, launch=edge). No overlap: browser for manifest, launch for dev open.

  const browser = parsed.browser ?? "chromium";
  const launch = parsed.launch ?? (browser === "firefox" ? "firefox" : "chrome");

  // CLI overrides config: --debug takes precedence over config.debug
  const debug = parsed.debug ?? config.debug ?? false;

  return {
    browser,
    launch,
    cache: parsed.cache ?? config.cache ?? true,
    report: parsed.report ?? false,
    debug,
    open: parsed.open ?? true,
  };
}

// ─── Shared Rsbuild instance creation ───

async function createRsbuildInstance(ctx: PipelineContext) {
  setOutputPrefixRsbuild();
  const { createRsbuild } = await import("@rsbuild/core");
  const rsbuild = await createRsbuild({
    rsbuildConfig: ctx.rsbuild,
    cwd: ctx.root,
    loadEnv: {
      cwd: ctx.root,
      prefixes: getLoadEnvPrefixes(ctx.config),
    },
  });
  return rsbuild;
}

/** Log extension size info to terminal. */
function logExtensionSize(distDir: string, rsbuildConfig: { output?: { sourceMap?: unknown } }): void {
  const size = getDistSizeSync(distDir);
  if (size < 0) return;
  const sizeStr = formatBytes(size);
  const suffix = isSourceMapEnabled(rsbuildConfig) ? " (with inline-source-map)" : "";
  logDoneWithValue("Extension size:", sizeStr + suffix);
}

// ─── addfox.config file watcher ───

const ADDFOX_CONFIG_DEBOUNCE_MS = 300;

/**
 * Watch addfox.config file; on change, run onRestart (e.g. close dev server and re-run dev in-process).
 * Returns the watcher so caller can close it before restarting.
 */
function watchAddfoxConfig(
  configPath: string,
  onRestart: () => void | Promise<void>
): { close: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const run = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      Promise.resolve(onRestart()).catch((e) => {
        error(formatError(e));
        exitWithError(e);
      });
    }, ADDFOX_CONFIG_DEBOUNCE_MS);
  };
  try {
    const watcher = watch(configPath, { persistent: true }, (eventType, filename) => {
      if (filename && (eventType === "change" || eventType === "rename")) run();
    });
    return { close() { try { watcher.close(); } catch { /* ignore */ } } };
  } catch {
    return { close() {} };
  }
}

// ─── Dev / Build commands ───

/** Dev mode: auto-restart dev server on addfox.config change. */
async function runDev(root: string, argv: string[]): Promise<void> {
  // Load config first to get defaults
  const { config, baseEntries, entries } = resolveAddfoxConfig(root);
  
  const resolved = resolveOptions(argv, config);
  const options: PipelineOptions = {
    root,
    command: 'dev',
    ...resolved,
    config,
    baseEntries,
    entries,
  };
  const rsbuildReadyStart = performance.now();
  const ctx = await runPipeline(options);
  process.env.NODE_ENV = ctx.isDev ? "development" : "production";
  const rsbuild = await createRsbuildInstance(ctx);
  logDoneTimed("Rsbuild ready", Math.round(performance.now() - rsbuildReadyStart));

  // Start WebSocket server immediately (parallel with dev server), don't wait for first compile
  const wsStartTime = performance.now();
  const hotReload = ctx.config.hotReload;
  const hotReloadEnabled = hotReload !== false;
  const hotReloadOpts = typeof hotReload === "object" && hotReload !== null ? hotReload : undefined;
  const wsPort = hotReloadOpts?.port ?? HMR_WS_PORT;
  const wsMode: WsServerMode = hotReloadEnabled && isChromiumBrowser(ctx.browser) ? "full" : "httpOnly";
  const wsDebugOpts: DebugServerOpts | undefined = ctx.config.debug ? {
    debug: true,
    root: ctx.root,
    outputRoot: ctx.config.outputRoot,
    distPath: ctx.distPath,
  } : undefined;
  // Fire-and-forget: WebSocket server starts immediately, reload manager will auto-connect when ready
  startWebSocketServer(wsPort, wsStartTime, wsDebugOpts, wsMode).catch(() => {});

  const configPath = getResolvedConfigFilePath(ctx.root);
  let devServerRef: Awaited<ReturnType<typeof rsbuild.startDevServer>> | null = null;
  let watcherRef: { close: () => void } | null = null;

  const onAddfoxConfigChange = async (): Promise<void> => {
    if (watcherRef) { watcherRef.close(); watcherRef = null; }
    if (devServerRef?.server?.close) await devServerRef.server.close();
    if (configPath) clearConfigCache(configPath);
    process.env.ADDFOX_CONFIG_RESTART = "1";
    try {
      await runDev(root, argv);
    } finally {
      delete process.env.ADDFOX_CONFIG_RESTART;
    }
  };

  if (configPath) watcherRef = watchAddfoxConfig(configPath, onAddfoxConfigChange);
  const devServerStart = performance.now();
  devServerRef = await rsbuild.startDevServer({ getPortSilently: true });
  const urls = devServerRef?.urls ?? [];
  const mainUrl = urls[0] ?? `http://localhost:${devServerRef?.port ?? "?"}`;
  logDoneTimed("Dev server " + mainUrl, Math.round(performance.now() - devServerStart));

  const devDistDir = (rsbuild.context as { distPath?: string } | undefined)?.distPath ?? ctx.distPath;
  setTimeout(() => logExtensionSize(devDistDir, ctx.rsbuild), 1000);
}

/** Build mode: compile + optional zip + auto browser launch. */
async function runBuild(root: string, argv: string[]): Promise<void> {
  // Load config first to get defaults
  const { config, baseEntries, entries } = resolveAddfoxConfig(root);
  
  const resolved = resolveOptions(argv, config);
  const options: PipelineOptions = {
    root,
    command: 'build',
    ...resolved,
    config,
    baseEntries,
    entries,
  };
  const rsbuildReadyStart = performance.now();
  const ctx = await runPipeline(options);
  const rsbuild = await createRsbuildInstance(ctx);
  logDoneTimed("Rsbuild ready", Math.round(performance.now() - rsbuildReadyStart));

  const buildStart = performance.now();
  const buildResult = await rsbuild.build();
  logDoneTimed("Rsbuild build", Math.round(performance.now() - buildStart));
  setOutputPrefixAddfox();

  if (ctx.config.zip !== false) {
    const zipPath = await zipDist(ctx.distPath, ctx.root, ctx.config.outDir, ctx.browser);
    logDone("Zipped output to", zipPath);
  }

  const distDir = (rsbuild.context as { distPath?: string } | undefined)?.distPath || ctx.distPath;
  const distSize = getBuildOutputSize(buildResult) ?? getDistSizeSync(distDir);
  if (distSize >= 0) logDoneWithValue("Extension size:", formatBytes(distSize));

  // Auto launch browser with loaded extension (unless --no-open)
  if (resolved.open) {
    const browserPathConfig = ctx.config.browserPath ?? {};
    await launchBrowserOnly({
      distPath: distDir,
      browser: resolved.launch,
      cache: resolved.cache,
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
    });
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return;
  }

  if (argv.includes("--version") || argv.includes("-v")) {
    console.log(getVersion());
    return;
  }

  wrapAddfoxOutput();
  setAddfoxLoggerRawWrites(getRawWrites());
  log("Addfox " + getVersion() + " with " + PURPLE + "Rsbuild " + getRsbuildVersion(root) + RESET);

  const command = argv[0];
  if (command === "test") {
    await runTest(root, argv);
    return;
  }

  if (!hasConfigFile()) {
    throw new AddfoxError({
      code: ADDFOX_ERROR_CODES.CONFIG_NOT_FOUND,
      message: "Addfox config file not found",
      details: `No addfox.config.ts, addfox.config.js or addfox.config.mjs found under ${root}`,
      hint: "Run the command from project root or create addfox.config.ts / addfox.config.js",
    });
  }

  // Command is determined by runDev/runBuild internally; set env before running
  process.env.NODE_ENV = command === "dev" ? "development" : "production";

  if (command === "dev") {
    await runDev(root, argv);
  } else {
    await runBuild(root, argv);
  }
}

main().catch((e) => {
  error(formatError(e));
  exitWithError(e);
});
