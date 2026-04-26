/**
 * Lightweight WebSocket server using only Node.js built-ins.
 * Replaces the `ws` npm package to reduce supply-chain risk.
 */

import { createHash } from "node:crypto";
import type { IncomingMessage, Server } from "node:http";
import type { Socket } from "node:net";

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

export const OPEN = 1;
export const CLOSING = 2;
export const CLOSED = 3;

/** @internal exported for tests */
export function acceptKey(key: string): string {
  return createHash("sha1").update(key + WS_GUID).digest("base64");
}

/** @internal exported for tests */
export function parseFrame(buffer: Buffer):
  | { opcode: number; payload: Buffer; consumed: number }
  | null {
  if (buffer.length < 2) return null;

  const byte1 = buffer[0];
  const byte2 = buffer[1];
  const opcode = byte1 & 0x0f;
  const masked = !!(byte2 & 0x80);

  let payloadLength = byte2 & 0x7f;
  let offset = 2;

  if (payloadLength === 126) {
    if (buffer.length < 4) return null;
    payloadLength = buffer.readUInt16BE(2);
    offset = 4;
  } else if (payloadLength === 127) {
    if (buffer.length < 10) return null;
    // Use only lower 48 bits; Node.js Buffer size is within safe int range.
    const high = buffer.readUInt32BE(2);
    if (high !== 0) return null; // payload too large
    payloadLength = buffer.readUInt32BE(6);
    offset = 10;
  }

  let maskingKey: Buffer | undefined;
  if (masked) {
    if (buffer.length < offset + 4) return null;
    maskingKey = buffer.subarray(offset, offset + 4);
    offset += 4;
  }

  if (buffer.length < offset + payloadLength) return null;

  let payload = buffer.subarray(offset, offset + payloadLength);
  if (maskingKey) {
    const unmasked = Buffer.alloc(payload.length);
    for (let i = 0; i < payload.length; i++) {
      unmasked[i] = payload[i] ^ maskingKey[i % 4];
    }
    payload = unmasked;
  }

  return { opcode, payload, consumed: offset + payloadLength };
}

/** @internal exported for tests */
export function buildFrame(opcode: number, payload: Buffer | string): Buffer {
  const data = typeof payload === "string" ? Buffer.from(payload, "utf-8") : payload;
  let headerLen = 2;
  if (data.length > 65535) {
    headerLen = 10;
  } else if (data.length > 125) {
    headerLen = 4;
  }
  const frame = Buffer.alloc(headerLen + data.length);
  frame[0] = 0x80 | (opcode & 0x0f); // FIN + opcode
  if (data.length > 65535) {
    frame[1] = 127;
    frame.writeUInt32BE(0, 2);
    frame.writeUInt32BE(data.length, 6);
    data.copy(frame, 10);
  } else if (data.length > 125) {
    frame[1] = 126;
    frame.writeUInt16BE(data.length, 2);
    data.copy(frame, 4);
  } else {
    frame[1] = data.length;
    data.copy(frame, 2);
  }
  return frame;
}

export class WebSocket {
  private socket: Socket;
  private _readyState = OPEN;
  private buffer = Buffer.alloc(0);

  constructor(socket: Socket) {
    this.socket = socket;
    socket.on("data", (data: Buffer) => {
      this.buffer = Buffer.concat([this.buffer, data]);
      while (this._readyState === OPEN) {
        const result = parseFrame(this.buffer);
        if (!result) break;
        this.buffer = this.buffer.subarray(result.consumed);
        this.handleFrame(result.opcode, result.payload);
      }
    });
    socket.on("close", () => {
      this._readyState = CLOSED;
    });
    socket.on("error", () => {
      this._readyState = CLOSED;
    });
  }

  get readyState(): number {
    return this._readyState;
  }

  send(data: string | Buffer): void {
    if (this._readyState !== OPEN) return;
    const frame = buildFrame(0x01, data);
    this.socket.write(frame);
  }

  close(): void {
    if (this._readyState === CLOSING || this._readyState === CLOSED) return;
    this._readyState = CLOSING;
    this.socket.write(buildFrame(0x08, Buffer.alloc(0)));
    this.socket.end();
  }

  private handleFrame(opcode: number, payload: Buffer): void {
    if (opcode === 0x08) {
      this.close();
      return;
    }
    if (opcode === 0x09) {
      // ping -> pong
      this.socket.write(buildFrame(0x0a, payload));
      return;
    }
    if (opcode === 0x01 || opcode === 0x02) {
      // text or binary frame; no automatic reply needed for this use-case
    }
  }

  get underlyingSocket(): Socket {
    return this.socket;
  }
}

export class WebSocketServer {
  private server: Server;
  private _clients = new Set<WebSocket>();
  private connectionListeners: Array<(ws: WebSocket) => void> = [];

  constructor(options: { server: Server }) {
    this.server = options.server;
    this.server.on("upgrade", (request: IncomingMessage, socket: Socket, head: Buffer) => {
      if (request.headers.upgrade !== "websocket") {
        socket.destroy();
        return;
      }
      const key = request.headers["sec-websocket-key"];
      if (!key || Array.isArray(key)) {
        socket.destroy();
        return;
      }

      const accept = acceptKey(key);
      socket.write(
        "HTTP/1.1 101 Switching Protocols\r\n" +
          "Upgrade: websocket\r\n" +
          "Connection: Upgrade\r\n" +
          `Sec-WebSocket-Accept: ${accept}\r\n` +
          "\r\n"
      );

      const ws = new WebSocket(socket);
      this._clients.add(ws);
      ws.underlyingSocket.on("close", () => {
        this._clients.delete(ws);
      });
      for (const listener of this.connectionListeners) {
        listener(ws);
      }
    });
  }

  get clients(): Set<WebSocket> {
    return this._clients;
  }

  on(event: "connection", listener: (ws: WebSocket) => void): void {
    if (event === "connection") {
      this.connectionListeners.push(listener);
    }
  }

  close(callback?: () => void): void {
    for (const client of this._clients) {
      client.close();
    }
    this._clients.clear();
    this.server.close(callback);
  }
}
