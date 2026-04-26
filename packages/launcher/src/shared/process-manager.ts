import { spawn, type ChildProcess } from "node:child_process";
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

function log(label: string, message: string, verbose?: boolean): void {
  if (verbose) console.log(`\x1b[36m[${label}]\x1b[0m ${message}`);
}

/** Spawn a browser process and wrap it in a BrowserProcess interface */
export async function spawnBrowserProcess(options: SpawnOptions): Promise<BrowserProcess> {
  const { binary, args, cwd, env, stdio, verbose, onExit } = options;

  log("Launcher", `Spawning: ${binary} ${args.map(a => a.includes(" ") ? `"${a}"` : a).join(" ")}`, verbose);

  const proc = spawn(binary, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: stdio ?? ["inherit", "inherit", "inherit"],
    detached: process.platform !== "win32",
  });

  const cleanup = () => {
    try {
      if (process.platform === "win32") {
        proc.kill("SIGTERM");
      } else {
        process.kill(-proc.pid!, "SIGKILL");
      }
    } catch {
      proc.kill("SIGKILL");
    }
  };

  const exitPromise = new Promise<void>((resolve) => {
    proc.on("exit", (code, signal) => {
      log("Launcher", `Process exited (code: ${code}, signal: ${signal})`, verbose);
      onExit?.(code, signal);
      resolve();
    });
    proc.on("error", (err) => {
      log("Launcher", `Process error: ${err.message}`, verbose);
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
