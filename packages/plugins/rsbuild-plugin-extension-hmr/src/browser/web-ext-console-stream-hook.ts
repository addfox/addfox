import { popWebExtStdoutOrigin, pushWebExtStdoutOrigin } from "@addfox/common";

export type WebExtConsoleStreamHookUninstall = () => void;

let installedUninstall: WebExtConsoleStreamHookUninstall | null = null;

/**
 * Wraps web-ext's pino `ConsoleStream.write` so CLI line-prefixing can tag [Web-ext] at the real
 * output source (not string matching). Idempotent while active.
 */
export async function installWebExtConsoleStreamHook(): Promise<void> {
  if (installedUninstall) return;
  const { consoleStream } = await import("web-ext/util/logger");
  const stream = consoleStream as { write: (json: string, opts?: { localProcess?: typeof process }) => void };
  const originalWrite = stream.write.bind(stream);
  stream.write = (jsonString: string, options?: { localProcess?: typeof process }): void => {
    pushWebExtStdoutOrigin();
    try {
      originalWrite(jsonString, options);
    } finally {
      popWebExtStdoutOrigin();
    }
  };
  installedUninstall = (): void => {
    stream.write = originalWrite;
    installedUninstall = null;
  };
}

export function removeWebExtConsoleStreamHook(): void {
  installedUninstall?.();
}
