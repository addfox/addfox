import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { CommonLaunchOptions, BrowserProcess } from "../types";
import { findBrowserPath, isChromium } from "../paths";
import { createTempProfile, spawnBrowserProcess } from "../shared/process-manager";
import { CDPClient, isLoadUnpackedUnsupported } from "./cdp";

export interface ChromiumLaunchOptions extends CommonLaunchOptions {
  /** Browser target name */
  target: string;
  /** User data dir (profile). Created if not provided. */
  userDataDir?: string;
  /** Enable developer mode in extensions */
  devtools?: boolean;
  /** Port for remote debugging (default: uses pipe) */
  remoteDebuggingPort?: number;
  /** Options for browser path resolution */
  pathOptions?: import("../types").PathOptions;
}

function log(label: string, message: string, verbose?: boolean): void {
  if (verbose) console.log(`\x1b[32m[${label}]\x1b[0m ${message}`);
}

/**
 * Build the chrome-launcher style flags for Chromium.
 * This is a lightweight replacement that does not require the chrome-launcher npm package.
 */
function buildChromeFlags(
  opts: ChromiumLaunchOptions,
  userDataDir: string,
  extensionPaths: string[],
): string[] {
  const flags: string[] = [];

  // Required for extensions
  flags.push("--enable-automation");

  // Extension loading
  if (extensionPaths.length > 0) {
    flags.push(`--load-extension=${extensionPaths.join(",")}`);
  }

  // Disable features that interfere with development
  flags.push(
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-features=Translate,OptimizationHints,MediaRouter,DialMediaRouteProvider,InterestFeedContentSuggestions,CertificateTransparencyComponentUpdater,AutofillServerCommunication,PrivacySandboxAdsApiOverride",
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

  // Pipe-based debugging for CDP
  if (opts.remoteDebuggingPort == null) {
    flags.push("--remote-debugging-pipe");
  } else {
    flags.push(`--remote-debugging-port=${opts.remoteDebuggingPort}`);
  }

  // Custom args
  if (opts.args) {
    flags.push(...opts.args);
  }

  return flags;
}

/**
 * Launch a Chromium-family browser with extension loading support.
 * Attempts CDP Extensions.loadUnpacked first, falls back to --load-extension.
 */
export async function launchChromium(options: ChromiumLaunchOptions): Promise<BrowserProcess> {
  const verbose = options.verbose ?? false;

  // Resolve binary
  const browserPath = options.binaryPath ?? findBrowserPath(options.target as any, options.pathOptions);
  if (!browserPath) {
    throw new Error(`Could not find browser binary for target: ${options.target}`);
  }
  log("Chromium", `Resolved binary: ${browserPath}`, verbose);

  // Prepare user data dir
  const userDataDir = options.userDataDir ?? createTempProfile("chromium");
  mkdirSync(userDataDir, { recursive: true });
  log("Chromium", `User data dir: ${userDataDir}`, verbose);

  // Resolve extension paths
  const extensionPaths = (options.extensionPaths ?? []).map((p) => resolve(p));

  // Build flags
  const flags = buildChromeFlags(options, userDataDir, extensionPaths);
  log("Chromium", `Flags: ${flags.join(" ")}`, verbose);

  // If we have remote-debugging-pipe and extensions to load, try CDP first
  const usePipe = !flags.some((f) => f.startsWith("--remote-debugging-port="));

  if (usePipe && extensionPaths.length > 0) {
    // Spawn with pipe debugging
    const proc = spawn(browserPath, flags, {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
      detached: false,
    });

    const cdp = new CDPClient(proc);

    // Wait a bit for CDP to be ready, then try loadUnpacked
    await new Promise<void>((resolve) => setTimeout(resolve, 800));

    for (const extPath of extensionPaths) {
      try {
        await cdp.sendCommand("Extensions.loadUnpacked", { path: extPath });
        log("Chromium", `Loaded extension via CDP: ${extPath}`, verbose);
      } catch (err) {
        if (isLoadUnpackedUnsupported(err)) {
          log("Chromium", "Extensions.loadUnpacked unsupported by this Chromium build, using --load-extension flag", verbose);
          cdp.close();
          break;
        }
        log("Chromium", `CDP error loading ${extPath}: ${(err as Error).message}`, verbose);
      }
    }

    // Wrap the process
    const browserProcess: BrowserProcess = {
      process: proc,
      exit: () => {
        cdp.close();
        return new Promise((resolve) => {
          proc.on("exit", resolve);
          proc.kill();
        });
      },
    };

    proc.on("exit", () => options.onExit?.());
    return browserProcess;
  }

  // Standard spawn without CDP
  return spawnBrowserProcess({
    binary: browserPath,
    args: flags,
    verbose,
    onExit: options.onExit,
  });
}

export { CDPClient, isLoadUnpackedUnsupported } from "./cdp";
