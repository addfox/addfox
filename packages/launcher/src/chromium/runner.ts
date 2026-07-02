import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { CommonLaunchOptions, BrowserProcess } from "../types";
import { findBrowserPath } from "../paths";
import { createTempProfile, spawnBrowserProcess, killProcessTreeWindows } from "../shared/process-manager";
import { CDPClient, isLoadUnpackedUnsupported } from "./cdp";

export interface ChromiumLaunchOptions extends CommonLaunchOptions {
  /** Browser target name */
  target: string;
  /** User data dir (profile). Created if not provided. */
  userDataDir?: string;
  /** Enable developer mode in extensions */
  devtools?: boolean;
  /** @deprecated No longer used; pipe mode is always used for CDP. */
  remoteDebuggingPort?: number;
  /** Options for browser path resolution */
  pathOptions?: import("../types").PathOptions;
  /**
   * How Chromium should load unpacked extensions.
   *
   * - "cdp": start with remote-debugging-pipe and wait for Extensions.loadUnpacked.
   * - "load-extension": pass --load-extension at startup and return once the browser process starts.
   */
  extensionLoadMode?: "cdp" | "load-extension";
}

function log(message: string, verbose?: boolean): void {
  if (verbose) console.log(message);
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function waitForCDPReady(cdp: CDPClient, verbose: boolean, timeoutMs = 5000): Promise<void> {
  const start = performance.now();
  let attempt = 0;
  while (performance.now() - start < timeoutMs) {
    attempt++;
    try {
      await cdp.sendCommand("Target.getTargets", {}, 100);
      log(`CDP ready after ${attempt} attempt(s), ${Math.round(performance.now() - start)}ms`, verbose);
      return;
    } catch {}
    await delay(50);
  }
  throw new Error(`CDP not ready within ${timeoutMs}ms`);
}

/**
 * Build the chrome-launcher style flags for Chromium.
 * This is a lightweight replacement that does not require the chrome-launcher npm package.
 */
export function buildChromeFlags(
  opts: ChromiumLaunchOptions,
  userDataDir: string,
  extensionPaths: string[],
  useDeprecatedLoadExtension: boolean,
): string[] {
  const flags: string[] = [];

  // Stability flags (similar to ChromeLauncher.defaultFlags minus exclusions)
  flags.push(
    "--disable-features=Translate,OptimizationHints,MediaRouter,DialMediaRouteProvider,InterestFeedContentSuggestions,CertificateTransparencyComponentUpdater,AutofillServerCommunication,PrivacySandboxAdsApiOverride,SafeBrowsingEnhancedProtection,SafeBrowsingPhishingProtection",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--no-first-run",
    "--disable-component-update",
    "--safebrowsing-disable-auto-update",
    "--disable-background-networking",
    "--disable-client-side-phishing-detection",
    "--no-default-browser-check",
  );

  // DevTools
  if (opts.devtools) {
    flags.push("--auto-open-devtools-for-tabs");
  }

  // User data dir
  flags.push(`--user-data-dir=${userDataDir}`);

  // Start URL
  if (opts.startUrl) {
    flags.push(opts.startUrl);
  }

  if (useDeprecatedLoadExtension) {
    // Fallback: use --load-extension flag for reliable extension loading
    if (extensionPaths.length > 0) {
      flags.push(`--load-extension=${extensionPaths.join(",")}`);
    }
  } else {
    // Primary: CDP pipe mode with Extensions.loadUnpacked
    flags.push("--remote-debugging-pipe", "--enable-unsafe-extension-debugging");
  }

  // Custom args
  if (opts.args) {
    flags.push(...opts.args);
  }

  return flags;
}

function makeBrowserProcessFromProc(
  proc: ChildProcess,
  verbose: boolean,
  onExit?: (code: number | null, signal: NodeJS.Signals | null) => void,
): BrowserProcess {
  let resolved = false;
  const exitPromise = new Promise<void>((resolve) => {
    proc.on("exit", (code, signal) => {
      if (resolved) return;
      resolved = true;
      log(`Process exited (code: ${code}, signal: ${signal})`, verbose);
      try {
        onExit?.(code, signal);
      } catch {
        // ignore callback errors
      }
      resolve();
    });
    proc.on("error", (err) => {
      if (resolved) return;
      resolved = true;
      console.error(`Process error: ${err.message}`);
      try {
        onExit?.(null, null);
      } catch {
        // ignore callback errors
      }
      resolve();
    });
  });

  return {
    process: proc,
    exit: async () => {
      try {
        if (process.platform === "win32") {
          killProcessTreeWindows(proc);
        } else {
          process.kill(-proc.pid!, "SIGKILL");
        }
      } catch {
        proc.kill("SIGKILL");
      }
      await exitPromise;
    },
  };
}

function hasPageTarget(result: unknown): boolean {
  const infos = (result as { targetInfos?: { type?: string }[] } | null)?.targetInfos;
  return Array.isArray(infos) && infos.some((info) => info?.type === "page");
}

function killBrowserProcess(proc: ChildProcess): void {
  try {
    if (process.platform === "win32") {
      killProcessTreeWindows(proc);
      return;
    }
    process.kill(-proc.pid!, "SIGKILL");
  } catch {
    proc.kill("SIGKILL");
  }
}

function startPageTargetWatcher(
  cdp: CDPClient,
  proc: ChildProcess,
  verbose: boolean,
  onWindowClosed: () => void,
): () => void {
  let stopped = false;
  let sawPageTarget = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const stop = (): void => {
    stopped = true;
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const schedule = (): void => {
    if (stopped) return;
    timer = setTimeout(() => { void check(); }, 1000);
    if (typeof timer.unref === "function") timer.unref();
  };

  const check = async (): Promise<void> => {
    try {
      const result = await cdp.sendCommand("Target.getTargets", {}, 500);
      const hasPage = hasPageTarget(result);
      sawPageTarget = sawPageTarget || hasPage;
      if (sawPageTarget && !hasPage) {
        log("No browser page targets remain; treating browser window as closed", verbose);
        stop();
        onWindowClosed();
        return;
      }
    } catch {
      /* CDP may be closing; process exit handler covers that path. */
    }
    schedule();
  };

  proc.once("exit", stop);
  schedule();
  return stop;
}

/**
 * Launch a Chromium-family browser with extension loading support.
 *
 * Attempt 1: Uses CDP pipe mode with Extensions.loadUnpacked for precise
 * extension loading (matching the pre-refactor chrome-launcher behavior).
 *
 * If Extensions.loadUnpacked is unsupported, falls back to Attempt 2:
 * Restart with --load-extension flag.
 */
export async function launchChromium(options: ChromiumLaunchOptions): Promise<BrowserProcess> {
  const verbose = options.verbose ?? false;

  // Resolve binary
  const browserPath = options.binaryPath ?? findBrowserPath(options.target as any, options.pathOptions);
  if (!browserPath) {
    throw new Error(`Could not find browser binary for target: ${options.target}`);
  }
  log(`Resolved binary: ${browserPath}`, verbose);

  // Prepare user data dir
  const userDataDir = options.userDataDir ?? createTempProfile("chromium");
  mkdirSync(userDataDir, { recursive: true });
  log(`User data dir: ${userDataDir}`, verbose);

  // Resolve extension paths
  const extensionPaths = (options.extensionPaths ?? []).map((p) => resolve(p));

  // If no extensions to load, or caller wants startup-flag loading, skip CDP and spawn directly.
  if (extensionPaths.length === 0 || options.extensionLoadMode === "load-extension") {
    const flags = buildChromeFlags(options, userDataDir, extensionPaths, true);
    log(`Flags: ${flags.join(" ")}`, verbose);
    return spawnBrowserProcess({
      binary: browserPath,
      args: flags,
      verbose,
      onExit: options.onExit,
    });
  }

  // Attempt 1: CDP pipe mode
  const flags = buildChromeFlags(options, userDataDir, extensionPaths, false);
  log(`Attempt 1 flags: ${flags.join(" ")}`, verbose);

  // Use fd 3/4 for remote-debugging-pipe (matching chrome-launcher behavior)
  const proc = spawn(browserPath, flags, {
    stdio: ["ignore", "pipe", "pipe", "pipe", "pipe"],
    detached: false,
  });

  // Consume stdout/stderr to prevent buffer deadlock on Windows
  if (proc.stdout) {
    proc.stdout.on("data", () => {});
  }
  if (proc.stderr) {
    proc.stderr.on("data", () => {});
  }

  const incoming = proc.stdio[4];
  const outgoing = proc.stdio[3];
  if (!incoming || !outgoing) {
    throw new Error("Failed to create remote-debugging-pipe file descriptors");
  }

  // Create CDP client immediately so the incoming pipe is consumed and Chrome
  // does not block writing its initial protocol messages.
  let onExitCalled = false;
  const callOnExit = () => {
    if (onExitCalled) return;
    onExitCalled = true;
    options.onExit?.();
  };
  const cdp = new CDPClient(
    incoming as NodeJS.ReadableStream,
    outgoing as NodeJS.WritableStream,
    () => {
      log("CDP pipe closed", verbose);
      callOnExit();
    },
  );

  // Wait for browser to initialize
  await waitForCDPReady(cdp, verbose, 5000);

  let needFallback = false;

  try {
    for (const extPath of extensionPaths) {
      const loadStart = performance.now();
      let lastErr: unknown = null;
      let loaded = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await cdp.sendCommand("Extensions.loadUnpacked", { path: extPath }, 60000);
          log(
            `Loaded extension via CDP: ${extPath} (${Math.round(performance.now() - loadStart)}ms, attempt ${attempt})`,
            verbose,
          );
          loaded = true;
          break;
        } catch (e) {
          lastErr = e;
          if (isLoadUnpackedUnsupported(e)) {
            needFallback = true;
            break;
          }
          if (attempt < 3) {
            log(`Extension load attempt ${attempt} failed for ${extPath}: ${e}, retrying...`, verbose);
            await delay(500);
          }
        }
      }
      if (!loaded && !needFallback) {
        console.error(`Failed to load extension ${extPath}: ${lastErr}`);
      }
      if (needFallback) break;
    }
  } catch {
    needFallback = true;
  }

  if (!needFallback) {
    // CDP mode succeeded
    log(`All extensions loaded via CDP`, verbose);
    const stopPageWatcher = startPageTargetWatcher(cdp, proc, verbose, () => {
      killBrowserProcess(proc);
      callOnExit();
    });
    const browserProcess = makeBrowserProcessFromProc(proc, verbose, callOnExit);
    return {
      process: browserProcess.process,
      exit: async () => {
        stopPageWatcher();
        await browserProcess.exit();
      },
    };
  }

  // Attempt 2: Fallback to --load-extension
  log(`CDP Extensions.loadUnpacked unsupported, falling back to --load-extension`, verbose);
  cdp.close();
  proc.kill("SIGKILL");
  await delay(500);

  const fallbackFlags = buildChromeFlags(options, userDataDir, extensionPaths, true);
  log(`Attempt 2 flags: ${fallbackFlags.join(" ")}`, verbose);

  return spawnBrowserProcess({
    binary: browserPath,
    args: fallbackFlags,
    verbose,
    onExit: options.onExit,
  });
}

export { CDPClient, isLoadUnpackedUnsupported } from "./cdp";
