import type { ChildProcess } from "node:child_process";

export interface CDPCommand {
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

export interface CDPResponse {
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

/**
 * Minimal Chrome DevTools Protocol client over remote-debugging-pipe.
 * Communicates via \0-delimited JSON over stdin/stdout of the child process.
 */
export class CDPClient {
  private id = 0;
  private pending = new Map<number, (res: CDPResponse) => void>();
  private buffer = "";
  private closed = false;

  constructor(private proc: ChildProcess) {
    if (proc.stdout) {
      proc.stdout.setEncoding("utf8");
      proc.stdout.on("data", (chunk: string) => this.onData(chunk));
    }
  }

  private onData(chunk: string): void {
    this.buffer += chunk;
    while (true) {
      const idx = this.buffer.indexOf("\0");
      if (idx === -1) break;
      const line = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 1);
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line) as CDPResponse;
        if (msg.id != null) {
          const resolve = this.pending.get(msg.id);
          if (resolve) {
            this.pending.delete(msg.id);
            resolve(msg);
          }
        }
      } catch {
        // ignore non-JSON lines
      }
    }
  }

  sendCommand(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (this.closed) return Promise.reject(new Error("CDP client closed"));
    const id = ++this.id;
    const cmd: CDPCommand = { id, method, params };
    const promise = new Promise<CDPResponse>((resolve) => {
      this.pending.set(id, resolve);
    });
    if (this.proc.stdin) {
      this.proc.stdin.write(JSON.stringify(cmd) + "\0");
    }
    return promise.then((res) => {
      if (res.error) {
        const err = new Error(res.error.message);
        (err as any).code = res.error.code;
        throw err;
      }
      return res.result;
    });
  }

  close(): void {
    this.closed = true;
    for (const [, resolve] of this.pending) {
      resolve({ id: -1, error: { code: -32000, message: "Client closed" } });
    }
    this.pending.clear();
  }
}

/** Check if an error indicates Extensions.loadUnpacked is unsupported. */
export function isLoadUnpackedUnsupported(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes("Extensions.loadUnpacked") ||
      err.message.includes("not found") ||
      err.message.includes("Could not find method"))
  );
}
