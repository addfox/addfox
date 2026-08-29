import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import readline from "node:readline";

import type { LaunchTarget, ChromiumLaunchTarget, BrowserConfig } from "@addfox/core";
import { log, logRaw, logDoneTimed, warn, error, ANSI_COLORS } from "@addfox/common";
import { runChromiumRunner } from "./runner";
import type { ChromiumRunnerOptions } from "./runner";
import { getBrowserPath, isChromiumBrowser, type LaunchPathOptions } from "./paths";
import {
  startWebSocketServer,
  closeWebSocketServer,
  notifyReload,
  type DebugServerOpts,
  type WsServerMode,
} from "../server/ws-server";
import {
  ensureDistReady,
  createReloadManagerExtension,
  getChromiumUserDataDir,
  getReloadManagerPath,
  getBrowserProfileDir,
} from "../manager/extension";
import { launchGecko, reinstallTemporaryAddonViaRDP } from "@addfox/launcher";

type ReloadServerPlan = { mode: WsServerMode | "none"; debugOpts?: DebugServerOpts };

export interface LaunchContext {
  distPath: string;
  browser: LaunchTarget;
  pathOpts: LaunchPathOptions;
  /** Resolved profile retention for this run (CLI/config precedence applied upstream). */
  keepBrowserProfile: boolean;
  /** Per-browser launch config from addfox.config `browser` option. */
  browserConfig?: BrowserConfig;
  enableReload: boolean;
  wsPort: number;
  chromiumRunnerOverride?: ChromiumRunnerOverride;
  ensureDistReadyOverride?: (distPath: string) => Promise<boolean>;
  getBrowserPathOverride?: (b: LaunchTarget, o: LaunchPathOptions) => string | null;
  onBrowserExit: () => void;
  debug?: boolean;
  root?: string;
  outputRoot?: string;
  /** Mutable bag filled by the CLI with the dev server URL; printed in the shortcuts block. */
  devServerInfo?: { url?: string };
}

function buildDebugServerOpts(ctx: LaunchContext): DebugServerOpts | undefined {
  if (!ctx.debug || !ctx.root || !ctx.outputRoot) return undefined;
  return { debug: true, root: ctx.root, outputRoot: ctx.outputRoot, distPath: ctx.distPath };
}

function computeReloadServerPlan(ctx: LaunchContext): ReloadServerPlan {
  const debugOpts = buildDebugServerOpts(ctx);
  if (ctx.enableReload) return { mode: "full", debugOpts };
  if (ctx.debug && debugOpts) return { mode: "httpOnly", debugOpts };
  return { mode: "none" };
}

async function startReloadServersForPlan(ctx: LaunchContext, plan: ReloadServerPlan): Promise<void> {
  if (plan.mode === "none") return;
  const t0 = performance.now();
  await startWebSocketServer(ctx.wsPort, t0, plan.debugOpts, plan.mode);
}

type ExtensionRunnerLike = {
  exit: () => Promise<void>;
};

let extensionRunner: ExtensionRunnerLike | null = null;
let reloadManagerPath: string | null = null;
let browserLaunched = false;
let isCleaningUp = false;
let cleanupHandlersRegistered = false;
let lastDistPath: string | null = null;
let lastOutputRoot: string | undefined;
let chromiumUserDataDirPath: string | null = null;
let lastChromiumBrowser: ChromiumLaunchTarget = "chrome";
let cacheEnabled = false;
let activeLaunchContext: LaunchContext | null = null;
let browserClosed = false;

let keyboardReloadCleanup: (() => void) | null = null;
/** Firefox RDP port for reloading temporary addons. */
let firefoxRdpPort: number | null = null;
/** Idempotent tail of cleanup (WS, keyboard, profile dirs) without touching extensionRunner. */
let addfoxDevResourcesTornDown = false;

const EXIT_TIMEOUT_MS = 500;
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<undefined>((resolve) => {
        timer = setTimeout(() => resolve(undefined), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export type ChromiumRunnerOverride = (
  opts: ChromiumRunnerOptions
) => Promise<{ exit: () => Promise<void> }>;

async function teardownAddfoxDevResources(): Promise<void> {
  if (addfoxDevResourcesTornDown) return;
  addfoxDevResourcesTornDown = true;
  const userDataDir =
    chromiumUserDataDirPath ??
    (lastDistPath ? getChromiumUserDataDir(lastDistPath, lastChromiumBrowser, lastOutputRoot) : null);
  if (!cacheEnabled && userDataDir && existsSync(userDataDir)) {
    // Fire-and-forget: don't block process exit waiting for directory removal
    rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
  chromiumUserDataDirPath = null;
  reloadManagerPath = null;
  firefoxRdpPort = null;
  if (keyboardReloadCleanup) {
    keyboardReloadCleanup();
    keyboardReloadCleanup = null;
  }
  closeWebSocketServer();
}

export async function cleanup(): Promise<void> {
  if (isCleaningUp) return;
  isCleaningUp = true;
  if (extensionRunner) {
    const er = extensionRunner;
    try {
      await withTimeout(er.exit(), EXIT_TIMEOUT_MS);
    } catch {
      /* Runner already stopped (e.g. browser closed externally). */
    }
    extensionRunner = null;
  }
  await teardownAddfoxDevResources();
  // Ensure stdin is restored after cleanup so process can exit cleanly
  if (keyboardReloadCleanup) {
    keyboardReloadCleanup();
    keyboardReloadCleanup = null;
  }
}

/** Handles SIGINT/SIGTERM. SIGINT is cooperative with the CLI. */
function handleTerminalExitRequest(signal: NodeJS.Signals): void {
  if (isCleaningUp) {
    if (signal === "SIGTERM") process.exit(0);
    return;
  }
  isCleaningUp = true;

  try {
    // Kill browser synchronously (non-blocking taskkill/spawn) so the
    // process tree is torn down before we exit.  On Windows this avoids
    // the "Terminate batch job (Y/N)?" prompt from CMD.
    if (extensionRunner) {
      void extensionRunner.exit();
      extensionRunner = null;
    }

    // Synchronous teardown: restore stdin, close websocket, and start
    // profile deletion. Do not wait for async cleanup.
    void teardownAddfoxDevResources().catch(() => {});
  } finally {
    // SIGINT is handled cooperatively with the CLI so it can close the
    // dev server before exiting. SIGTERM should exit immediately.
    if (signal === "SIGTERM") process.exit(0);
  }
}

function registerStdinRShortcut(
  onPressR: (() => void) | null,
  onPressO: (() => void) | null,
  printHint?: () => void
): void {
  const stdin = process.stdin;

  // Non-terminal readline keeps Ctrl+C on the default SIGINT path instead of
  // capturing it as stdin input.
  const rl = readline.createInterface({
    input: stdin,
    terminal: false,
  });

  // stdin may not be a TTY (e.g. launched via pnpm/turbo/bun); resume so line
  // events flow on a piped stdin as well.
  try { stdin.resume(); } catch { /* ignore */ }

  const onLine = (line: string): void => {
    const input = line.trim().toLowerCase();
    if (input === "r" && onPressR) {
      onPressR();
    } else if (input === "o" && onPressO) {
      onPressO();
    }
  };

  rl.on("line", onLine);
  printHint?.();
  keyboardReloadCleanup = () => {
    rl.off("line", onLine);
    rl.close();
    // Release stdin so the process can exit cleanly after teardown.
    try { stdin.pause(); } catch { /* ignore */ }
  };
}

/**
 * Print the key hints (original one-line style) followed by the dev URLs as a
 * tree block (same style as the Entry tree), so hints and URLs appear together.
 */
function printShortcutsAndUrlsBlock(ctx: LaunchContext): void {
  if (ctx.enableReload) {
    log("Press r + enter to reload, o + enter to reopen browser (Ctrl-C to quit)");
  }

  const urls: Array<[string, string]> = [];
  if (ctx.devServerInfo?.url) urls.push(["Dev server", ctx.devServerInfo.url]);
  if (ctx.enableReload) urls.push(["WebSocket", "ws://127.0.0.1:" + ctx.wsPort]);
  if (urls.length === 0) return;

  const nameColor = ANSI_COLORS.TREE;
  const valueColor = ANSI_COLORS.TIME;
  const reset = ANSI_COLORS.RESET;
  const lines: string[] = [nameColor + "URLs" + reset];
  urls.forEach(([name, value], i) => {
    const branchPrefix = i === urls.length - 1 ? "└── " : "├── ";
    lines.push(branchPrefix + nameColor + name + reset + " -> " + valueColor + value + reset);
  });
  logRaw(lines.join("\n"));
}

function registerTerminalShortcuts(ctx: LaunchContext): void {
  if (keyboardReloadCleanup) return;
  // Do not require a TTY: when addfox dev runs through pnpm/turbo/bun the
  // stdin is often a non-TTY pipe, yet r/o + enter still work via readline.
  const stdin = process.stdin;
  if (!stdin || stdin.destroyed) return;
  registerStdinRShortcut(
    ctx.enableReload ? () => notifyReload("reload-extension") : null,
    () => reopenBrowser(),
    () => printShortcutsAndUrlsBlock(ctx)
  );
}

export function registerCleanupHandlers(): void {
  if (cleanupHandlersRegistered) return;
  cleanupHandlersRegistered = true;
  process.on("SIGINT", () => handleTerminalExitRequest("SIGINT"));
  process.on("SIGTERM", () => handleTerminalExitRequest("SIGTERM"));
}

async function runGecko(
  browser: "firefox" | "zen",
  distPath: string,
  browserBinary: string | undefined,
  onExit: () => void,
  opts: { debug: boolean; reloadOnChange: boolean; reloadManagerPath?: string | null }
): Promise<void> {
  const userDataDir = resolve(getBrowserProfileDir(distPath), `${browser}-user-data`);
  const extensionPaths = [distPath];
  if (opts.reloadManagerPath) {
    extensionPaths.push(opts.reloadManagerPath);
  }
  const { process, rdpPort } = await launchGecko({
    target: browser,
    binaryPath: browserBinary,
    userDataDir,
    extensionPaths,
    args: opts.debug ? ["-jsconsole"] : [],
    verbose: false,
    onExit,
  });
  extensionRunner = process;
  firefoxRdpPort = rdpPort;
}

export async function launchBrowserCore(ctx: LaunchContext): Promise<void> {
  const launchStart = performance.now();
  addfoxDevResourcesTornDown = false;
  cacheEnabled = ctx.keepBrowserProfile;
  lastDistPath = ctx.distPath;
  lastOutputRoot = ctx.outputRoot;
  activeLaunchContext = ctx;
  browserClosed = false;
  const browserBinary = resolveBrowserBinary(ctx);
  
  // Quick check: dist should be ready since first compile is done (done hook triggered)
  // No need for long polling - reload manager extension will auto-connect when ready
  const readyFn = ctx.ensureDistReadyOverride ?? (() => ensureDistReady(ctx.distPath));
  await readyFn(ctx.distPath).catch((e: Error) => { error(e.message); });

  const plan = computeReloadServerPlan(ctx);
  // WebSocket server is already started in parallel by CLI, this is idempotent
  await startReloadServersForPlan(ctx, plan);
  if (plan.mode === "full") {
    reloadManagerPath = await createReloadManagerExtension(ctx.wsPort, ctx.distPath, ctx.browser);
  }
  registerTerminalShortcuts(ctx);

  if (isChromiumBrowser(ctx.browser)) {
    await resetChromiumProfileIfCacheDisabled(ctx);
    await launchChromiumBrowser(ctx, browserBinary, launchStart);
    return;
  }
  await launchFirefoxBrowser(ctx, browserBinary, launchStart);
}

/** Browser binary resolution: addfox.config browser.<name>.path > deprecated browserPath > OS defaults. */
function resolveBrowserBinary(ctx: LaunchContext): string | null {
  if (ctx.getBrowserPathOverride) return ctx.getBrowserPathOverride(ctx.browser, ctx.pathOpts);
  return getBrowserPath(ctx.browser, ctx.pathOpts, ctx.browserConfig);
}

/**
 * Resolve the chromium user-data dir: addfox.config `browser.<name>.profile`
 * (relative to project root) wins; otherwise the default under the cache root.
 */
function resolveChromiumUserDataDir(
  distPath: string,
  browser: ChromiumLaunchTarget,
  outputRoot: string | undefined,
  root: string | undefined,
  browserConfig: BrowserConfig | undefined
): string {
  const custom = browserConfig?.[browser]?.profile;
  if (custom && custom.trim() !== "") return resolve(root ?? process.cwd(), custom.trim());
  return getChromiumUserDataDir(distPath, browser, outputRoot);
}

/**
 * When profile retention is disabled (the default), wipe the previous run's
 * user-data dir before launch so every run starts from a fresh profile.
 * Done at process start (browser not running yet, no file locks) rather than
 * only at exit, so crashed/killed runs cannot leave a stale profile behind.
 * The "o" reopen shortcut does NOT go through here — it keeps the profile
 * for the duration of the dev session.
 */
async function resetChromiumProfileIfCacheDisabled(ctx: LaunchContext): Promise<void> {
  if (ctx.keepBrowserProfile) return;
  const dir = resolveChromiumUserDataDir(
    ctx.distPath,
    ctx.browser as ChromiumLaunchTarget,
    ctx.outputRoot,
    ctx.root,
    ctx.browserConfig
  );
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function handleBrowserExit(): void {
  if (isCleaningUp) return;
  log(`${ANSI_COLORS.RED}Browser was closed. Press o + enter to reopen.${ANSI_COLORS.RESET}`);
  browserClosed = true;
  extensionRunner = null;
  isCleaningUp = false;
}

async function reopenBrowser(): Promise<void> {
  if (!activeLaunchContext || !browserClosed) return;
  browserClosed = false;
  isCleaningUp = false;
  const ctx = activeLaunchContext;
  const browserBinary = resolveBrowserBinary(ctx);
  const launchStart = performance.now();
  if (keyboardReloadCleanup) {
    keyboardReloadCleanup();
    keyboardReloadCleanup = null;
  }
  registerTerminalShortcuts(ctx);
  if (isChromiumBrowser(ctx.browser)) {
    await launchChromiumBrowser(ctx, browserBinary, launchStart);
    return;
  }
  await launchFirefoxBrowser(ctx, browserBinary, launchStart);
}

async function launchChromiumBrowser(
  ctx: LaunchContext,
  browserBinary: string | null,
  launchStart: number
): Promise<void> {
  lastChromiumBrowser = ctx.browser as ChromiumLaunchTarget;
  chromiumUserDataDirPath = resolveChromiumUserDataDir(
    ctx.distPath,
    ctx.browser as ChromiumLaunchTarget,
    ctx.outputRoot,
    ctx.root,
    ctx.browserConfig
  );
  await mkdir(chromiumUserDataDirPath, { recursive: true });
  // Cache growth is bounded by launcher flags (--disk-cache-size etc.) and the
  // HTTP cache is cleared via CDP after launch; no profile dirs are deleted,
  // which keeps Service Worker / login state consistent.
  const extensions = [ctx.distPath, reloadManagerPath].filter(Boolean) as string[];
  const runnerFn = ctx.chromiumRunnerOverride ?? runChromiumRunner;
  extensionRunner = await runnerFn({
    target: ctx.browser,
    chromePath: browserBinary || undefined,
    userDataDir: chromiumUserDataDirPath,
    extensions,
    startUrl: "chrome://extensions",
    verbose: false,
    onExit: ctx.onBrowserExit,
  });
  logDoneTimed(ctx.browser + " started, extensions loaded.", Math.round(performance.now() - launchStart));
}

async function launchFirefoxBrowser(
  ctx: LaunchContext,
  browserBinary: string | null,
  launchStart: number
): Promise<void> {
  await runGecko(ctx.browser as "firefox" | "zen", ctx.distPath, browserBinary || undefined, ctx.onBrowserExit, {
    debug: ctx.debug === true,
    reloadOnChange: ctx.enableReload,
    reloadManagerPath,
  });
  logDoneTimed(ctx.browser + " started, extension loaded.", Math.round(performance.now() - launchStart));
}

export interface HmrPluginOptionsForLaunch {
  distPath: string;
  browser?: LaunchTarget;
  /**
   * @deprecated Use `keepBrowserProfile` instead. Still honored during the
   * deprecation window.
   */
  cache?: boolean;
  /** Keep the browser profile (user data dir) between runs. Default false. */
  keepBrowserProfile?: boolean;
  /** Per-browser launch config (path / profile / keepBrowserProfile overrides). */
  browserConfig?: BrowserConfig;
  wsPort?: number;
  enableReload?: boolean;
  debug?: boolean;
  root?: string;
  outputRoot?: string;
  /** Mutable bag filled by the CLI with the dev server URL; printed in the shortcuts block. */
  devServerInfo?: { url?: string };
  chromePath?: string;
  chromiumPath?: string;
  edgePath?: string;
  bravePath?: string;
  vivaldiPath?: string;
  operaPath?: string;
  santaPath?: string;
  arcPath?: string;
  yandexPath?: string;
  browserosPath?: string;
  customPath?: string;
  firefoxPath?: string;
  zenPath?: string;
}

export async function launchBrowser(
  options: HmrPluginOptionsForLaunch,
  chromiumRunnerOverride?: ChromiumRunnerOverride,
  ensureDistReadyOverride?: (distPath: string) => Promise<boolean>,
  getBrowserPathOverride?: (b: LaunchTarget, o: LaunchPathOptions) => string | null
): Promise<void> {
  const {
    distPath,
    browser = "chrome",
    wsPort = 23333,
    enableReload = true,
    debug,
    root,
    outputRoot,
  } = options;
  // keepBrowserProfile wins; deprecated `cache` is the fallback during the deprecation window
  const keepBrowserProfile = options.keepBrowserProfile ?? options.cache ?? false;
  const onBrowserExit = () => handleBrowserExit();
  await launchBrowserCore({
    distPath,
    browser,
    debug,
    root,
    outputRoot,
    browserConfig: options.browserConfig,
    pathOpts: {
      chromePath: options.chromePath,
      chromiumPath: options.chromiumPath,
      edgePath: options.edgePath,
      bravePath: options.bravePath,
      vivaldiPath: options.vivaldiPath,
      operaPath: options.operaPath,
      santaPath: options.santaPath,
      arcPath: options.arcPath,
      yandexPath: options.yandexPath,
      browserosPath: options.browserosPath,
      customPath: options.customPath,
      firefoxPath: options.firefoxPath,
      zenPath: options.zenPath,
    },
    keepBrowserProfile,
    enableReload,
    wsPort,
    devServerInfo: options.devServerInfo,
    chromiumRunnerOverride,
    ensureDistReadyOverride,
    getBrowserPathOverride,
    onBrowserExit,
  });
}

export function setBrowserLaunched(value: boolean): void {
  browserLaunched = value;
}

export function getBrowserLaunched(): boolean {
  return browserLaunched;
}

export function getFirefoxRdpPort(): number | null {
  return firefoxRdpPort;
}

export async function reloadFirefoxAddonViaRdp(addonPath: string): Promise<void> {
  const port = firefoxRdpPort;
  if (!port) {
    throw new Error("Firefox RDP port not available; browser may not have launched yet.");
  }
  await reinstallTemporaryAddonViaRDP(port, addonPath);
}

export function statsHasErrors(stats: unknown): boolean {
  if (!stats || typeof stats !== "object") return false;
  const s = stats as { hasErrors?: () => boolean };
  return Boolean(s.hasErrors?.());
}

export {
  getReloadManagerPath,
  getChromiumUserDataDir,
  getCacheRoot,
  getBrowserProfileDir,
  /** @deprecated Use getCacheRoot/getBrowserProfileDir instead */
  getCacheTempRoot,
  findExistingReloadManager,
  ensureDistReady,
} from "../manager/extension";

export async function launchBrowserOnly(
  options: LaunchOnlyOptions,
  chromiumRunnerOverride?: ChromiumRunnerOverride
): Promise<void> {
  const { distPath, browser = "chrome" } = options;
  // keepBrowserProfile wins; deprecated `cache` is the fallback during the deprecation window
  const keepBrowserProfile = options.keepBrowserProfile ?? options.cache ?? false;
  addfoxDevResourcesTornDown = false;
  cacheEnabled = keepBrowserProfile;
  lastDistPath = distPath;
  lastOutputRoot = options.outputRoot;
  registerCleanupHandlers();

  let resolveClosed: () => void;
  const closedPromise = new Promise<void>((r) => { resolveClosed = r; });
  const onBrowserExit = () => {
    log(`${ANSI_COLORS.RED}Exiting because the browser was closed.${ANSI_COLORS.RESET}`);
    // Start cleanup but exit immediately so the terminal is not blocked
    // waiting for the browser process tree or file removal.
    void cleanup().catch(() => {});
    resolveClosed();
    process.exit(0);
  };

  const doLaunch = async (): Promise<void> => {
    const browserBinary = getBrowserPath(browser, {
      chromePath: options.chromePath,
      chromiumPath: options.chromiumPath,
      edgePath: options.edgePath,
      bravePath: options.bravePath,
      vivaldiPath: options.vivaldiPath,
      operaPath: options.operaPath,
      santaPath: options.santaPath,
      arcPath: options.arcPath,
      yandexPath: options.yandexPath,
      browserosPath: options.browserosPath,
      customPath: options.customPath,
      firefoxPath: options.firefoxPath,
      zenPath: options.zenPath,
    }, options.browserConfig);
    await ensureDistReady(distPath);
    if (isChromiumBrowser(browser)) {
      if (!browserBinary) {
        throw new Error(`${browser} path not found; set browser.${browser}.path in addfox.config, or install the browser at a default location`);
      }
      lastChromiumBrowser = browser;
      chromiumUserDataDirPath = resolveChromiumUserDataDir(distPath, browser, options.outputRoot, options.root, options.browserConfig);
      // Fresh profile per launch unless keepBrowserProfile is explicitly enabled
      if (!keepBrowserProfile && existsSync(chromiumUserDataDirPath)) {
        await rm(chromiumUserDataDirPath, { recursive: true, force: true }).catch(() => {});
      }
      await mkdir(chromiumUserDataDirPath, { recursive: true });
      const runnerFn = chromiumRunnerOverride ?? runChromiumRunner;
      extensionRunner = await runnerFn({
        target: browser,
        chromePath: browserBinary,
        userDataDir: chromiumUserDataDirPath,
        extensions: [distPath],
        startUrl: "chrome://extensions",
        verbose: false,
        onExit: onBrowserExit,
      });
      logDoneTimed(browser + " started (build launch), extension loaded.", Math.round(performance.now()));
      return;
    }
    await runGecko(browser as "firefox" | "zen", distPath, browserBinary ?? undefined, onBrowserExit, {
      debug: options.debug ?? false,
      reloadOnChange: options.enableReload ?? false,
    });
    logDoneTimed(browser + " started (build launch), extension loaded.", 0);
  };
  return doLaunch().then(() => closedPromise);
}

export type LaunchOnlyOptions = Pick<
  HmrPluginOptionsForLaunch,
  | "distPath"
  | "browser"
  | "keepBrowserProfile"
  | "cache"
  | "browserConfig"
  | "root"
  | "chromePath"
  | "chromiumPath"
  | "edgePath"
  | "bravePath"
  | "vivaldiPath"
  | "operaPath"
  | "santaPath"
  | "arcPath"
  | "yandexPath"
  | "browserosPath"
  | "customPath"
  | "firefoxPath"
  | "zenPath"
  | "cache"
  | "outputRoot"
  | "debug"
  | "enableReload"
>;
