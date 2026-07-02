import { spawn, execSync, type ChildProcess } from "node:child_process";
import { createWriteStream } from "node:fs";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import type { BrowserProcess } from "../types";

export interface SpawnOptions {
  /** Binary to execute */
  binary: string;
  /** Arguments */
  args: string[];
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string | undefined>;
  /** Stdio mode */
  stdio?: ["pipe" | "inherit", "pipe" | "inherit", "pipe" | "inherit"];
  /** Verbose logging */
  verbose?: boolean;
  /** Called when process exits */
  onExit?: (code: number | null, signal: NodeJS.Signals | null) => void;
}

function log(message: string, verbose?: boolean): void {
  if (verbose) console.log(message);
}

/**
 * Kill a process and its entire process tree on Windows.
 * Uses a detached spawn so the taskkill command survives parent exit.
 * Falls back to proc.kill() if taskkill fails to spawn.
 */
export function killProcessTreeWindows(proc: ChildProcess): void {
  if (proc.pid == null) {
    proc.kill("SIGKILL");
    return;
  }
  try {
    // /T = terminate all child processes, /F = force
    // detached: true ensures taskkill runs in its own session and won't
    // be killed when the parent Node.js process exits immediately.
    spawn("taskkill", ["/PID", String(proc.pid), "/T", "/F"], {
      detached: true,
      windowsHide: true,
      stdio: "ignore",
    });
  } catch {
    proc.kill("SIGKILL");
  }
}

/** Spawn a browser process and wrap it in a BrowserProcess interface */
export async function spawnBrowserProcess(options: SpawnOptions): Promise<BrowserProcess> {
  const { binary, args, cwd, env, stdio, verbose, onExit } = options;

  log(`Spawning: ${binary} ${args.map(a => a.includes(" ") ? `"${a}"` : a).join(" ")}`, verbose);

  const proc = spawn(binary, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: stdio ?? ["inherit", "inherit", "inherit"],
    // On Windows, keep the browser out of the Node.js console process group
    // and don't let it inherit the console. This prevents Ctrl+C from being
    // delayed by the browser process tree.
    detached: true,
    windowsHide: true,
  });

  const cleanup = () => {
    try {
      if (process.platform === "win32") {
        killProcessTreeWindows(proc);
      } else {
        process.kill(-proc.pid!, "SIGKILL");
      }
    } catch {
      proc.kill("SIGKILL");
    }
  };

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
      cleanup();
      await exitPromise;
    },
  };
}

/**
 * Create a temporary user profile directory.
 * Returns the path and whether it should be cleaned up on exit.
 */
export function createTempProfile(prefix: string): string {
  const tmpDir = process.env.TMPDIR ?? process.env.TEMP ?? "/tmp";
  const dir = join(tmpDir, `addfox-launcher-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Guess the profile directory path for a given browser and OS.
 */
export function guessDefaultProfileDir(browserName: string): string | null {
  const home = process.env.HOME ?? process.env.USERPROFILE;
  if (!home) return null;
  const platform = process.platform;

  if (platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA ?? join(home, "AppData", "Local");
    return join(localAppData, browserName, "User Data", "Default");
  }
  if (platform === "darwin") {
    return join(home, "Library", "Application Support", browserName, "Default");
  }
  // linux
  const configHome = process.env.XDG_CONFIG_HOME ?? join(home, ".config");
  return join(configHome, browserName);
}
