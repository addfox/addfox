import { resolve, join } from "node:path";
import type { CommonLaunchOptions, BrowserProcess } from "../types";
import { findBrowserPath } from "../paths";
import { spawnBrowserProcess } from "../shared/process-manager";
import { createGeckoProfile } from "./profile";
import { findFreePort, installTemporaryAddonViaRDP } from "./rdp";

export interface GeckoLaunchOptions extends CommonLaunchOptions {
  /** Browser target name */
  target: string;
  /** User data dir (profile). Created if not provided. */
  userDataDir?: string;
  /** Enable remote debugging */
  remoteDebuggingPort?: number;
  /** Open browser console (Firefox devtools) */
  devtools?: boolean;
  /** Options for browser path resolution */
  pathOptions?: import("../types").PathOptions;
}

function log(label: string, message: string, verbose?: boolean): void {
  if (verbose) console.log(`\x1b[33m[${label}]\x1b[0m ${message}`);
}

function getDefaultProfileDir(target: string): string {
  return join(process.cwd(), ".addfox", "cache", "browser-profile", `${target}-user-data`);
}

/**
 * Build CLI arguments for a Gecko browser.
 * Based on fx-runner / web-ext conventions.
 */
function buildGeckoArgs(
  opts: GeckoLaunchOptions,
  profileDir: string,
  rdpPort: number | null
): string[] {
  const args: string[] = [];

  // Profile
  args.push("-profile", profileDir);

  // No remote (don't attach to running instance)
  args.push("-no-remote");

  // New instance
  args.push("-new-instance");

  // Remote debugging server (used to install temporary addons)
  if (rdpPort != null) {
    args.push("-start-debugger-server", String(rdpPort));
  }

  // Start URL
  if (opts.startUrl) {
    args.push(opts.startUrl);
  }

  // Custom args (filter out params that cause Firefox to exit on Windows)
  if (opts.args) {
    for (const a of opts.args) {
      // -foreground and -jsconsole can cause Firefox to exit immediately
      // on Windows when stdio is piped. Skip them.
      if (process.platform === "win32" && (a === "-foreground" || a === "-jsconsole" || a === "--devtools")) {
        continue;
      }
      args.push(a);
    }
  }

  return args;
}

/**
 * Launch a Gecko-family browser (Firefox, Zen, LibreWolf, Waterfox, Floorp, etc.)
 */
export async function launchGecko(options: GeckoLaunchOptions): Promise<BrowserProcess> {
  const verbose = options.verbose ?? false;

  // Resolve binary
  const browserPath = options.binaryPath ?? findBrowserPath(options.target as any, options.pathOptions);
  if (!browserPath) {
    throw new Error(`Could not find browser binary for target: ${options.target}`);
  }
  log("Gecko", `Resolved binary: ${browserPath}`, verbose);

  // Prepare profile
  const profileDir = options.userDataDir ?? getDefaultProfileDir(options.target);
  createGeckoProfile(profileDir);
  log("Gecko", `Profile dir: ${profileDir}`, verbose);

  // Resolve extension paths
  const extensionPaths = (options.extensionPaths ?? []).map((p) => resolve(p));
  const hasExtensions = extensionPaths.length > 0;
  if (hasExtensions) {
    log("Gecko", `Extensions: ${extensionPaths.join(", ")}`, verbose);
  }

  // Find a free port for RDP if we need to install extensions
  let rdpPort: number | null = null;
  if (hasExtensions) {
    rdpPort = options.remoteDebuggingPort ?? (await findFreePort());
    log("Gecko", `RDP port: ${rdpPort}`, verbose);
  }

  // Build args
  const args = buildGeckoArgs(options, profileDir, rdpPort);
  log("Gecko", `Args: ${args.join(" ")}`, verbose);

  // Spawn Firefox
  // On Windows, firefox.exe is a launcher that exits with code 0 immediately
  // after starting the actual browser process. We must not treat this as the
  // browser being closed, or the dev server will exit prematurely.
  const isWindowsLauncher = process.platform === "win32";
  const wrappedOnExit = isWindowsLauncher
    ? (code: number | null) => {
        if (code === 0) return; // launcher finished its job
        options.onExit?.();
      }
    : options.onExit;

  const browserProcess = await spawnBrowserProcess({
    binary: browserPath,
    args,
    verbose,
    onExit: wrappedOnExit,
    stdio: ["pipe", "pipe", "pipe"],
  });

  // Install extensions via RDP after Firefox starts
  if (hasExtensions && rdpPort != null) {
    try {
      for (const extPath of extensionPaths) {
        log("Gecko", `Installing temporary addon: ${extPath}`, verbose);
        await installTemporaryAddonViaRDP(rdpPort, extPath);
        log("Gecko", `Installed ${extPath}`, verbose);
      }
    } catch (err: any) {
      log("Gecko", `Failed to install addon: ${err.message || err}`, verbose);
      // Don't kill Firefox on install failure — let the user see the browser
    }
  }

  return browserProcess;
}
