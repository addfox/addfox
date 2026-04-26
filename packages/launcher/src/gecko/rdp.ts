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
    // Unsolicited events (no pending request for this actor)
    if (!from || !this.pending || this.pending.target !== from) {
      // Ignore unsolicited events (tabNavigated, etc.)
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

export async function installTemporaryAddonViaRDP(
  port: number,
  addonPath: string
): Promise<void> {
  const client = await connectWithRetry(port);
  try {
    // Get addons actor via getRoot (Firefox 55+)
    let addonsActor: string | undefined;
    try {
      const root = await client.request({ to: "root", type: "getRoot" });
      addonsActor = root.addonsActor;
    } catch {
      // Fallback to listTabs (older Firefox)
      const tabs = await client.request({ to: "root", type: "listTabs" });
      addonsActor = tabs.addonsActor;
    }

    if (!addonsActor) {
      throw new Error(
        "This version of Firefox does not support remote temporary add-on installation. " +
          "Try Firefox 49 or higher."
      );
    }

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
