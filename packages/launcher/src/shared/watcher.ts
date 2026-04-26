import { watch, type FSWatcher } from "node:fs";
import { resolve } from "node:path";
import { statSync } from "node:fs";

export type WatchCallback = (path: string, event: "change" | "add" | "unlink") => void;

export interface WatchOptions {
  /** Directories to watch */
  paths: string[];
  /** Callback on file change */
  onChange: WatchCallback;
  /** Debounce interval in ms */
  debounceMs?: number;
  /** Verbose logging */
  verbose?: boolean;
}

/** Watch files for changes and invoke a callback. */
export function watchFiles(options: WatchOptions): { close: () => void } {
  const { paths, onChange, debounceMs = 200, verbose } = options;
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const watchers: FSWatcher[] = [];

  const log = (msg: string) => {
    if (verbose) console.log(`\x1b[35m[Watcher]\x1b[0m ${msg}`);
  };

  const trigger = (filePath: string, event: "change" | "add" | "unlink") => {
    const existing = timers.get(filePath);
    if (existing) clearTimeout(existing);
    timers.set(
      filePath,
      setTimeout(() => {
        timers.delete(filePath);
        onChange(filePath, event);
      }, debounceMs),
    );
  };

  for (const dir of paths) {
    const resolved = resolve(dir);
    try {
      if (!statSync(resolved).isDirectory()) {
        log(`Skipping non-directory: ${resolved}`);
        continue;
      }
      const w = watch(resolved, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        const fullPath = resolve(resolved, filename);
        log(`Event: ${eventType} on ${filename}`);
        trigger(fullPath, eventType === "rename" ? "add" : "change");
      });
      watchers.push(w);
      log(`Watching: ${resolved}`);
    } catch (e) {
      log(`Failed to watch ${resolved}: ${e}`);
    }
  }

  return {
    close: () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
      for (const w of watchers) w.close();
    },
  };
}
