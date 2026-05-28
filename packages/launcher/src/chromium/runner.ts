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
}

function log(message: string, verbose?: boolean): void {
  if (verbose) console.log(message);
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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
    "--disable-features=Translate,OptimizationHints,MediaRouter,DialMediaRouteProvider,InterestFeedContentSuggestions,CertificateTransparencyComponentUpdater,AutofillServerCommunication,PrivacySandboxAdsApiOverride",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--no-first-run",
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
  const exitPromise = new Promise<void>((resolve) => {
    proc.on("exit", (code, signal) => {
      log(`Process exited (code: ${code}, signal: ${signal})`, verbose);
      onExit?.(code, signal);
      resolve();
    });
    proc.on("error", (err) => {
      console.error(`Process error: ${err.message}`);
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

  // If no extensions to load, skip CDP and spawn directly
  if (extensionPaths.length === 0) {
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

  // Consume stderr to prevent buffer deadlock on Windows
  if (proc.stderr) {
    proc.stderr.on("data", () => {});
  }

  // Wait for browser to initialize
  await delay(800);

  const incoming = proc.stdio[4];
  const outgoing = proc.stdio[3];
  if (!incoming || !outgoing) {
    throw new Error("Failed to create remote-debugging-pipe file descriptors");
  }

  const cdp = new CDPClient(incoming as NodeJS.ReadableStream, outgoing as NodeJS.WritableStream);
  let needFallback = false;

  try {
    for (const extPath of extensionPaths) {
      try {
        await cdp.sendCommand("Extensions.loadUnpacked", { path: extPath });
        log(`Loaded extension via CDP: ${extPath}`, verbose);
      } catch (e) {
        if (isLoadUnpackedUnsupported(e)) {
          needFallback = true;
          break;
        }
        // Log but continue for other errors (e.g., path not found)
        console.error(`Failed to load extension ${extPath}: ${e}`);
      }
    }
  } catch {
    needFallback = true;
  }

  if (!needFallback) {
    // CDP mode succeeded
    log(`All extensions loaded via CDP`, verbose);
    return makeBrowserProcessFromProc(proc, verbose, options.onExit);
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
