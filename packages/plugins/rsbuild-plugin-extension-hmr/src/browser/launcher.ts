import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";

import type { LaunchTarget, ChromiumLaunchTarget } from "@addfox/core";
import { log, logDoneTimed, warn, error, ANSI_COLORS } from "@addfox/common";
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
import { launchGecko } from "@addfox/launcher";

type ReloadServerPlan = { mode: WsServerMode | "none"; debugOpts?: DebugServerOpts };

function buildDebugServerOpts(ctx: LaunchContext): DebugServerOpts | undefined {
  if (!ctx.debug || !ctx.root || !ctx.outputRoot) return undefined;
  return { debug: true, root: ctx.root, outputRoot: ctx.outputRoot, distPath: ctx.distPath };
}

function computeReloadServerPlan(ctx: LaunchContext): ReloadServerPlan {
  const debugOpts = buildDebugServerOpts(ctx);
  const full = ctx.enableReload && isChromiumBrowser(ctx.browser);
  if (full) return { mode: "full", debugOpts };
  // Start HTTP server for error reporting in debug mode (Firefox or when reload is disabled)
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
let keyboardReloadCleanup: (() => void) | null = null;
/** Idempotent tail of {@link cleanup} (WS, keyboard, profile dirs) without touching extensionRunner. */
let addfoxDevResourcesTornDown = false;
/** True after Firefox has started in this process. */
let firefoxSessionActive = false;
/** First SIGINT hint for Firefox dev; second SIGINT performs cleanup. */
let firefoxSigintHintConsumed = false;

const MSG_FIREFOX_CLOSE_BROWSER_THEN_CTRL_C =
  "Please close the browser first, then press Ctrl+C again to exit.";

const EXIT_TIMEOUT_MS = 2000;
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

export interface LaunchContext {
  distPath: string;
  browser: LaunchTarget;
  pathOpts: LaunchPathOptions;
  cache: boolean;
  enableReload: boolean;
  wsPort: number;
  chromiumRunnerOverride?: ChromiumRunnerOverride;
  ensureDistReadyOverride?: (distPath: string) => Promise<boolean>;
  getBrowserPathOverride?: (b: LaunchTarget, o: LaunchPathOptions) => string | null;
  onBrowserExit: () => void;
  debug?: boolean;
  root?: string;
  outputRoot?: string;
}

async function teardownAddfoxDevResources(): Promise<void> {
  if (addfoxDevResourcesTornDown) return;
  addfoxDevResourcesTornDown = true;
  firefoxSessionActive = false;
  const userDataDir =
    chromiumUserDataDirPath ??
    (lastDistPath ? getChromiumUserDataDir(lastDistPath, lastChromiumBrowser, lastOutputRoot) : null);
  if (!cacheEnabled && userDataDir && existsSync(userDataDir)) {
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
  chromiumUserDataDirPath = null;
  reloadManagerPath = null;
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
}

/** Same as SIGINT handler. */
function handleTerminalExitRequest(signal: NodeJS.Signals): void {
  if (isCleaningUp) {
    log("Force exit (cleanup in progress).");
    process.exit(0);
    return;
  }
  if (
    signal === "SIGINT" &&
    firefoxSessionActive &&
    !firefoxSigintHintConsumed
  ) {
    firefoxSigintHintConsumed = true;
    log(MSG_FIREFOX_CLOSE_BROWSER_THEN_CTRL_C);
    return;
  }
  void cleanup().then(() => process.exit(0)).catch(() => process.exit(1));
}

function stdinChunkHasCtrlC(chunk: Buffer | string): boolean {
  if (typeof chunk === "string") {
    for (let i = 0; i < chunk.length; i++) {
      if (chunk.charCodeAt(i) === 3) return true;
    }
    return false;
  }
  return chunk.includes(3);
}

function registerStdinRShortcut(onPressR: () => void): void {
  const stdin = process.stdin;
  const onData = (chunk: Buffer | string): void => {
    if (stdinChunkHasCtrlC(chunk)) {
      handleTerminalExitRequest("SIGINT");
      return;
    }
    const s = typeof chunk === "string" ? chunk : chunk.toString("utf8");
    if (!s) return;
    const c = s.trim().toLowerCase();
    if (c === "r") onPressR();
  };
  stdin.setEncoding("utf8");
  if (typeof stdin.setRawMode === "function") {
    stdin.setRawMode(true);
  }
  stdin.resume();
  stdin.on("data", onData);
  log("Press R to reload extension (and Ctrl-C to quit)");
  keyboardReloadCleanup = () => {
    stdin.off("data", onData);
    if (typeof stdin.setRawMode === "function") {
      stdin.setRawMode(false);
    }
    stdin.pause();
  };
}

function registerManualReloadShortcut(enableReload: boolean, browser: LaunchTarget): void {
  if (!enableReload || !isChromiumBrowser(browser) || !process.stdin.isTTY) return;
  if (keyboardReloadCleanup) return;
  registerStdinRShortcut(() => {
    // Manual terminal shortcut must use direct extension reload path.
    notifyReload("reload-extension");
  });
}

export function registerCleanupHandlers(): void {
  if (cleanupHandlersRegistered) return;
  cleanupHandlersRegistered = true;
  process.on("SIGINT", () => handleTerminalExitRequest("SIGINT"));
  process.on("SIGTERM", () => handleTerminalExitRequest("SIGTERM"));
}

async function runFirefox(
  distPath: string,
  browserBinary: string | undefined,
  onExit: () => void,
  opts: { debug: boolean; reloadOnChange: boolean }
): Promise<void> {
  const userDataDir = resolve(getBrowserProfileDir(distPath), "firefox-user-data");
  const process = await launchGecko({
    target: "firefox",
    binaryPath: browserBinary,
    userDataDir,
    extensionPaths: [distPath],
    args: opts.debug ? ["-jsconsole"] : [],
    verbose: opts.debug,
    onExit,
  });
  extensionRunner = process;
  firefoxSessionActive = true;
}

export async function launchBrowserCore(ctx: LaunchContext): Promise<void> {
  const launchStart = performance.now();
  addfoxDevResourcesTornDown = false;
  firefoxSessionActive = false;
  firefoxSigintHintConsumed = false;
  cacheEnabled = ctx.cache;
  lastDistPath = ctx.distPath;
  lastOutputRoot = ctx.outputRoot;
  const browserBinary = (ctx.getBrowserPathOverride ?? getBrowserPath)(ctx.browser, ctx.pathOpts);
  
  // Quick check: dist should be ready since first compile is done (done hook triggered)
  // No need for long polling - reload manager extension will auto-connect when ready
  const readyFn = ctx.ensureDistReadyOverride ?? (() => ensureDistReady(ctx.distPath));
  await readyFn(ctx.distPath).catch((e: Error) => { error(e.message); });

  const plan = computeReloadServerPlan(ctx);
  // WebSocket server is already started in parallel by CLI, this is idempotent
  await startReloadServersForPlan(ctx, plan);
  if (plan.mode === "full") {
    reloadManagerPath = await createReloadManagerExtension(ctx.wsPort, ctx.distPath);
    registerManualReloadShortcut(ctx.enableReload, ctx.browser);
  }

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
  if (!browserBinary) {
    warn(ctx.browser, "path not found; set", `browserPath.${ctx.browser}`, "in addfox.config, or install the browser at a default location");
    return;
  }
  lastChromiumBrowser = ctx.browser as ChromiumLaunchTarget;
  chromiumUserDataDirPath = getChromiumUserDataDir(
    ctx.distPath,
    ctx.browser as ChromiumLaunchTarget,
    ctx.outputRoot
  );
  await mkdir(chromiumUserDataDirPath, { recursive: true });
  const extensions = [ctx.distPath, reloadManagerPath].filter(Boolean) as string[];
  const runnerFn = ctx.chromiumRunnerOverride ?? runChromiumRunner;
  extensionRunner = await runnerFn({
    chromePath: browserBinary,
    userDataDir: chromiumUserDataDirPath,
    extensions,
    startUrl: "chrome://extensions",
    onExit: ctx.onBrowserExit,
  });
  logDoneTimed(ctx.browser + " started, extensions loaded.", Math.round(performance.now() - launchStart));
}

async function launchFirefoxBrowser(
  ctx: LaunchContext,
  browserBinary: string | null,
  launchStart: number
): Promise<void> {
  await runFirefox(ctx.distPath, browserBinary || undefined, ctx.onBrowserExit, {
    debug: ctx.debug === true,
    reloadOnChange: ctx.enableReload,
  });
  logDoneTimed("Firefox started, extension loaded.", Math.round(performance.now() - launchStart));
}

export interface HmrPluginOptionsForLaunch {
  distPath: string;
  browser?: LaunchTarget;
  cache?: boolean;
  wsPort?: number;
  enableReload?: boolean;
  debug?: boolean;
  root?: string;
  outputRoot?: string;
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
    cache = false,
    wsPort = 23333,
    enableReload = true,
    debug,
    root,
    outputRoot,
  } = options;
  const onBrowserExit = () => {
    log(`${ANSI_COLORS.RED}Exiting because the browser was closed.${ANSI_COLORS.RESET}`);
    cleanup().then(() => process.exit(0)).catch(() => process.exit(1));
  };
  await launchBrowserCore({
    distPath,
    browser,
    debug,
    root,
    outputRoot,
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
    },
    cache,
    enableReload,
    wsPort,
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
  const { distPath, browser = "chrome", cache = false } = options;
  addfoxDevResourcesTornDown = false;
  firefoxSessionActive = false;
  firefoxSigintHintConsumed = false;
  cacheEnabled = cache;
  lastDistPath = distPath;
  lastOutputRoot = options.outputRoot;
  registerCleanupHandlers();

  let resolveClosed: () => void;
  const closedPromise = new Promise<void>((r) => { resolveClosed = r; });
  const onBrowserExit = () => {
    log(`${ANSI_COLORS.RED}Exiting because the browser was closed.${ANSI_COLORS.RESET}`);
    cleanup().then(() => { resolveClosed(); process.exit(0); }).catch(() => process.exit(1));
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
    });
    await ensureDistReady(distPath);
    if (isChromiumBrowser(browser)) {
      if (!browserBinary) {
        throw new Error(`${browser} path not found; set browserPath.${browser} in addfox.config, or install the browser at a default location`);
      }
      lastChromiumBrowser = browser;
      chromiumUserDataDirPath = getChromiumUserDataDir(distPath, browser, options.outputRoot);
      await mkdir(chromiumUserDataDirPath, { recursive: true });
      const runnerFn = chromiumRunnerOverride ?? runChromiumRunner;
      extensionRunner = await runnerFn({
        chromePath: browserBinary,
        userDataDir: chromiumUserDataDirPath,
        extensions: [distPath],
        startUrl: "chrome://extensions",
        onExit: onBrowserExit,
      });
      logDoneTimed(browser + " started (build launch), extension loaded.", Math.round(performance.now()));
      return;
    }
    await runFirefox(distPath, browserBinary ?? undefined, onBrowserExit, {
      debug: options.debug ?? false,
      reloadOnChange: options.enableReload ?? false,
    });
    logDoneTimed("Firefox started (build launch), extension loaded.", 0);
  };
  return doLaunch().then(() => closedPromise);
}

export type LaunchOnlyOptions = Pick<
  HmrPluginOptionsForLaunch,
  | "distPath"
  | "browser"
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
  | "cache"
  | "outputRoot"
  | "debug"
  | "enableReload"
>;
