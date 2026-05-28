import { resolve, join, basename } from "node:path";
import { createConnection } from "node:net";
import { execSync } from "node:child_process";
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

function log(message: string, verbose?: boolean): void {
  if (verbose) console.log(message);
}

function getDefaultProfileDir(target: string): string {
  return join(process.cwd(), ".addfox", "cache", "browser-profile", `${target}-user-data`);
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Poll the RDP port to detect when Firefox has actually closed.
 * On Windows, firefox.exe is a stub launcher that exits immediately (code 0).
 * The real browser process keeps the RDP port open; when it closes, the port
 * becomes unreachable.
 */
function watchRdpPort(port: number, onClose: () => void): () => void {
  const check = () => {
    const socket = createConnection({ port, host: "127.0.0.1" });
    let connected = false;
    socket.on("connect", () => {
      connected = true;
      socket.destroy();
    });
    socket.on("error", () => {
      if (!connected) {
        clearInterval(interval);
        onClose();
      }
    });
    socket.setTimeout(2000, () => {
      socket.destroy();
    });
  };
  // Delay first check so Firefox has time to fully start
  let interval: ReturnType<typeof setInterval> | undefined;
  const timeout = setTimeout(() => {
    check();
    interval = setInterval(check, 3000);
  }, 2000);
  return () => {
    clearTimeout(timeout);
    if (interval) clearInterval(interval);
  };
}

/**
 * Build CLI arguments for a Gecko browser.
 * Based on fx-runner / web-ext conventions.
 */
export function buildGeckoArgs(
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
export async function launchGecko(options: GeckoLaunchOptions): Promise<{ process: BrowserProcess; rdpPort: number | null }> {
  const verbose = options.verbose ?? false;

  // Resolve binary
  const browserPath = options.binaryPath ?? findBrowserPath(options.target as any, options.pathOptions);
  if (!browserPath) {
    throw new Error(`Could not find browser binary for target: ${options.target}`);
  }
  log(`Resolved binary: ${browserPath}`, verbose);

  // Prepare profile
  const profileDir = options.userDataDir ?? getDefaultProfileDir(options.target);
  createGeckoProfile(profileDir);
  log(`Profile dir: ${profileDir}`, verbose);

  // Resolve extension paths
  const extensionPaths = (options.extensionPaths ?? []).map((p) => resolve(p));
  const hasExtensions = extensionPaths.length > 0;
  if (hasExtensions) {
    log(`Extensions: ${extensionPaths.join(", ")}`, verbose);
  }

  // Find a free port for RDP if we need to install extensions
  let rdpPort: number | null = null;
  if (hasExtensions) {
    rdpPort = options.remoteDebuggingPort ?? (await findFreePort());
    log(`RDP port: ${rdpPort}`, verbose);
  }

  // Build args
  const args = buildGeckoArgs(options, profileDir, rdpPort);
  log(`Flags: ${args.join(" ")}`, verbose);

  // On Windows, firefox.exe is a launcher that exits with code 0 immediately
  // after starting the actual browser process. We must not treat this as the
  // browser being closed, or the dev server will exit prematurely.
  // Instead, we use RDP port polling to detect when the real browser closes.
  const isWindowsLauncher = process.platform === "win32";
  const wrappedOnExit = isWindowsLauncher
    ? (code: number | null, signal: NodeJS.Signals | null) => {
        // Windows stub launchers often exit with code 0 and no signal.
        // The real browser process is detected via RDP port polling instead.
        if (signal == null && (code === 0 || code == null)) return;
        options.onExit?.();
      }
    : options.onExit;

  // Spawn Firefox
  const browserProcess = await spawnBrowserProcess({
    binary: browserPath,
    args,
    verbose,
    onExit: wrappedOnExit,
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stopWatching: (() => void) | null = null;
  if (isWindowsLauncher && rdpPort != null) {
    stopWatching = watchRdpPort(rdpPort, () => {
      log("Browser closed (RDP port unreachable)", verbose);
      options.onExit?.();
    });
  }

  // Install extensions via RDP after Firefox starts
  if (hasExtensions && rdpPort != null) {
    try {
      // Give Firefox a moment to start the RDP server
      await delay(800);
      for (const extPath of extensionPaths) {
        log(`Installing temporary addon: ${extPath}`, verbose);
        await installTemporaryAddonViaRDP(rdpPort, extPath);
        log(`Installed ${extPath}`, verbose);
      }
    } catch (err: any) {
      console.error(`Failed to install addon: ${err.message || err}`);
      // Don't kill Firefox on install failure — let the user see the browser
    }
  }

  // Wrap exit to also stop the RDP watcher
  const originalExit = browserProcess.exit;
  const browserName = basename(browserPath);
  const wrappedProcess: BrowserProcess = {
    process: browserProcess.process,
    exit: async () => {
      if (stopWatching) {
        stopWatching();
        stopWatching = null;
      }
      // On Windows the stub launcher exits immediately; the real browser
      // process is no longer in the same process tree.  Use a synchronous
      // taskkill by image name so the browser is reliably closed even when
      // Node exits right afterwards (e.g. Ctrl+C).
      // Skip during tests to avoid killing the test runner itself.
      if (isWindowsLauncher && !process.env.ADDFOX_LAUNCHER_TEST_MODE) {
        try {
          execSync(`taskkill /IM ${browserName} /F`, { windowsHide: true, stdio: "ignore", timeout: 3000 });
        } catch {
          /* Browser may already be closed */
        }
      }
      await originalExit();
    },
  };

  return { process: wrappedProcess, rdpPort };
}
