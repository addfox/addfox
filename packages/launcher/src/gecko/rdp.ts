import { createConnection, createServer, type Socket } from "node:net";

function encodeRDP(msg: object): string {
  const str = JSON.stringify(msg);
  return `${Buffer.byteLength(str)}:${str}`;
}

/**
 * Firefox Remote Debugging Protocol (RDP) client.
 * Replicates web-ext's rdp-client.js behavior.
 *
 * RDP packets are length-prefixed JSON: BYTE_LENGTH + ':' + DATA
 *
 * Responses are matched by the `from` field (sender actor), not requestId.
 * Only one request per actor is active at a time.
 */
class RDPClient {
  private conn: Socket;
  private buffer = Buffer.alloc(0);
  private pending: {
    target: string;
    resolve: (v: any) => void;
    reject: (e: any) => void;
  } | null = null;
  private unsolicited = new Map<string, any>();
  private connected = false;

  constructor(port: number) {
    this.conn = createConnection({ port, host: "127.0.0.1" });
    this.conn.on("data", (data) => this.onData(data));
    this.conn.on("error", (err) => this.reject(err));
    this.conn.on("close", () => this.reject(new Error("RDP connection closed")));
  }

  /** Wait for TCP connection and consume the initial root greeting. */
  async connect(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.conn.once("connect", resolve);
      this.conn.once("error", reject);
    });

    // Wait for the initial unsolicited greeting from root actor
    const greeting = await this.waitForMessage("root");
    if (greeting.error) throw greeting;

    this.connected = true;
  }

  private waitForMessage(target: string): Promise<any> {
    const buffered = this.unsolicited.get(target);
    if (buffered) {
      this.unsolicited.delete(target);
      return Promise.resolve(buffered);
    }
    return new Promise((resolve, reject) => {
      this.pending = { target, resolve, reject };
    });
  }

  /** Send a request and wait for the response from the target actor. */
  async request(msg: any): Promise<any> {
    if (!this.connected) throw new Error("RDP client not connected");
    const target = (msg.to as string) || "root";
    const promise = this.waitForMessage(target);
    this.conn.write(encodeRDP(msg));
    return promise;
  }

  private onData(data: Buffer) {
    this.buffer = Buffer.concat([this.buffer, data]);
    while (true) {
      const msg = this.parseMessage();
      if (!msg) break;
      this.handleMessage(msg);
    }
  }

  private parseMessage(): any | null {
    const str = this.buffer.toString();
    const sepIdx = str.indexOf(":");
    if (sepIdx < 1) return null;

    const byteLen = parseInt(str.slice(0, sepIdx), 10);
    if (isNaN(byteLen)) {
      this.buffer = this.buffer.slice(sepIdx + 1);
      return null;
    }

    const dataStart = sepIdx + 1;
    if (this.buffer.length - dataStart < byteLen) return null;

    const msgBuf = this.buffer.slice(dataStart, dataStart + byteLen);
    this.buffer = this.buffer.slice(dataStart + byteLen);

    try {
      return JSON.parse(msgBuf.toString());
    } catch {
      return null;
    }
  }

  private handleMessage(msg: any) {
    const from = msg.from as string | undefined;
    if (!from) return;
    // Buffer unsolicited messages so waitForMessage can pick them up
    if (!this.pending || this.pending.target !== from) {
      this.unsolicited.set(from, msg);
      return;
    }

    const deferred = this.pending;
    this.pending = null;
    if (msg.error) deferred.reject(msg);
    else deferred.resolve(msg);
  }

  private reject(err: Error) {
    if (this.pending) {
      this.pending.reject(err);
      this.pending = null;
    }
  }

  disconnect() {
    this.conn.end();
  }
}

export async function findFreePort(): Promise<number> {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address() as { port: number };
      srv.close(() => resolve(addr.port));
    });
  });
}

async function connectWithRetry(
  port: number,
  maxRetries = 100,
  retryInterval = 120
): Promise<RDPClient> {
  for (let i = 0; i <= maxRetries; i++) {
    const client = new RDPClient(port);
    try {
      await client.connect();
      return client;
    } catch (err: any) {
      client.disconnect();
      if (err.code === "ECONNREFUSED" || err.message?.includes("ECONNREFUSED")) {
        if (i < maxRetries) {
          await new Promise((r) => setTimeout(r, retryInterval));
          continue;
        }
      }
      throw err;
    }
  }
  throw new Error(`Failed to connect to Firefox RDP on port ${port}`);
}

async function getAddonsActor(client: RDPClient): Promise<string> {
  try {
    const root = await client.request({ to: "root", type: "getRoot" });
    if (root.addonsActor) return root.addonsActor;
  } catch { /* ignore */ }
  // Fallback to listTabs (older Firefox)
  const tabs = await client.request({ to: "root", type: "listTabs" });
  if (tabs.addonsActor) return tabs.addonsActor;
  throw new Error(
    "This version of Firefox does not support remote temporary add-on installation. " +
      "Try Firefox 49 or higher."
  );
}

export async function installTemporaryAddonViaRDP(
  port: number,
  addonPath: string
): Promise<string | undefined> {
  const client = await connectWithRetry(port);
  try {
    const addonsActor = await getAddonsActor(client);

    const result = await client.request({
      to: addonsActor,
      type: "installTemporaryAddon",
      addonPath,
      openDevTools: false,
    });

    return result.id as string | undefined;
  } finally {
    client.disconnect();
  }
}

/**
 * Re-install a temporary addon via Firefox Remote Debugging Protocol to trigger reload.
 * Firefox does not support a 'reload' command on addonsActor; re-installing an already-installed
 * temporary addon causes Firefox to reload it (same behaviour as web-ext).
 */
export async function reinstallTemporaryAddonViaRDP(
  port: number,
  addonPath: string
): Promise<void> {
  const client = await connectWithRetry(port);
  try {
    const addonsActor = await getAddonsActor(client);

    await client.request({
      to: addonsActor,
      type: "installTemporaryAddon",
      addonPath,
      openDevTools: false,
    });
  } finally {
    client.disconnect();
  }
}
