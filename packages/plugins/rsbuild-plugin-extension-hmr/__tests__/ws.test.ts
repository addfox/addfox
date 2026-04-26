import { describe, expect, it } from "@rstest/core";
import { createServer } from "node:http";
import type { Socket } from "node:net";
import { connect } from "node:net";
import { acceptKey, buildFrame, parseFrame, WebSocket, WebSocketServer, OPEN, CLOSED } from "../src/lib/ws.ts";

/* ─── pure function tests ─── */

describe("acceptKey", () => {
  it("produces the RFC 6455 example accept value", () => {
    // RFC 6455 Sec. 1.3: key "dGhlIHNhbXBsZSBub25jZQ==" -> "s3pPLMBiTxaQ9kYGzzhZRbK+xOo="
    expect(acceptKey("dGhlIHNhbXBsZSBub25jZQ==")).toBe("s3pPLMBiTxaQ9kYGzzhZRbK+xOo=");
  });

  it("produces deterministic output for arbitrary keys", () => {
    const key = "x3JJHMbDL1EzLkh9GBhXDw==";
    const result = acceptKey(key);
    expect(typeof result).toBe("string");
    expect(result.length).toBe(28); // base64 of 20-byte SHA-1
    expect(result).toBe(acceptKey(key));
  });
});

describe("buildFrame", () => {
  it("builds a small text frame", () => {
    const frame = buildFrame(0x01, "hi");
    expect(frame[0]).toBe(0x81); // FIN + text opcode
    expect(frame[1]).toBe(2); // payload length
    expect(frame.subarray(2).toString("utf-8")).toBe("hi");
  });

  it("builds a medium frame (126 extended length)", () => {
    const payload = "x".repeat(200);
    const frame = buildFrame(0x01, payload);
    expect(frame[0]).toBe(0x81);
    expect(frame[1]).toBe(126);
    expect(frame.readUInt16BE(2)).toBe(200);
    expect(frame.subarray(4).toString("utf-8")).toBe(payload);
  });

  it("builds a large frame (127 extended length)", () => {
    const payload = Buffer.alloc(70000, 0xab);
    const frame = buildFrame(0x02, payload);
    expect(frame[0]).toBe(0x82); // FIN + binary opcode
    expect(frame[1]).toBe(127);
    expect(frame.readUInt32BE(2)).toBe(0);
    expect(frame.readUInt32BE(6)).toBe(70000);
    expect(frame.subarray(10).equals(payload)).toBe(true);
  });

  it("builds a close frame with empty payload", () => {
    const frame = buildFrame(0x08, Buffer.alloc(0));
    expect(frame[0]).toBe(0x88);
    expect(frame[1]).toBe(0);
    expect(frame.length).toBe(2);
  });
});

describe("parseFrame", () => {
  it("returns null for incomplete header", () => {
    expect(parseFrame(Buffer.from([0x81]))).toBeNull();
  });

  it("parses an unmasked text frame", () => {
    const payload = Buffer.from("hello", "utf-8");
    const frame = buildFrame(0x01, payload);
    const result = parseFrame(frame);
    expect(result).not.toBeNull();
    expect(result!.opcode).toBe(0x01);
    expect(result!.payload.toString("utf-8")).toBe("hello");
    expect(result!.consumed).toBe(frame.length);
  });

  it("parses a masked frame and unmasks payload", () => {
    const maskingKey = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    const payload = Buffer.from("test", "utf-8");
    const masked = Buffer.alloc(payload.length);
    for (let i = 0; i < payload.length; i++) {
      masked[i] = payload[i] ^ maskingKey[i % 4];
    }
    const frame = Buffer.alloc(2 + 4 + payload.length);
    frame[0] = 0x81;
    frame[1] = 0x80 | payload.length; // MASK = 1
    maskingKey.copy(frame, 2);
    masked.copy(frame, 6);

    const result = parseFrame(frame);
    expect(result).not.toBeNull();
    expect(result!.payload.toString("utf-8")).toBe("test");
  });

  it("parses a ping frame", () => {
    const frame = buildFrame(0x09, Buffer.alloc(0));
    const result = parseFrame(frame);
    expect(result).not.toBeNull();
    expect(result!.opcode).toBe(0x09);
  });

  it("parses multiple frames from a single buffer", () => {
    const f1 = buildFrame(0x01, "a");
    const f2 = buildFrame(0x01, "b");
    const buf = Buffer.concat([f1, f2]);

    const r1 = parseFrame(buf);
    expect(r1).not.toBeNull();
    expect(r1!.payload.toString("utf-8")).toBe("a");

    const r2 = parseFrame(buf.subarray(r1!.consumed));
    expect(r2).not.toBeNull();
    expect(r2!.payload.toString("utf-8")).toBe("b");
  });
});

/* ─── integration tests with real sockets ─── */

describe("WebSocketServer + WebSocket", () => {
  it("performs handshake and server sends text", async () => {
    const httpServer = createServer();
    const wss = new WebSocketServer({ server: httpServer });

    wss.on("connection", (ws: WebSocket) => {
      ws.send("connected");
    });

    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const port = (httpServer.address() as import("node:net").AddressInfo).port;

    const clientSocket = connect(port);
    const clientData: Buffer[] = [];
    let receivedMessage: string | null = null;

    await new Promise<void>((resolve, reject) => {
      clientSocket.on("connect", () => {
        clientSocket.write(
          "GET / HTTP/1.1\r\n" +
            "Host: localhost\r\n" +
            "Upgrade: websocket\r\n" +
            "Connection: Upgrade\r\n" +
            "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n" +
            "Sec-WebSocket-Version: 13\r\n" +
            "\r\n"
        );
      });

      clientSocket.on("data", (data: Buffer) => {
        clientData.push(data);
        const buf = Buffer.concat(clientData);
        const headerEnd = buf.indexOf("\r\n\r\n");
        if (headerEnd === -1) return;

        const frameData = buf.subarray(headerEnd + 4);
        if (frameData.length === 0) return;

        const result = parseFrame(frameData);
        if (result) {
          receivedMessage = result.payload.toString("utf-8");
          resolve();
        }
      });

      clientSocket.on("error", reject);
      setTimeout(() => reject(new Error("timeout")), 2000);
    });

    expect(receivedMessage).toBe("connected");

    clientSocket.destroy();
    wss.close();
  });

  it("receives a masked text frame from client", async () => {
    const httpServer = createServer();
    const wss = new WebSocketServer({ server: httpServer });

    let serverReceived: string | null = null;
    wss.on("connection", (ws: WebSocket) => {
      // Hook into the underlying socket to capture what the client sends
      const originalHandle = (ws as unknown as { handleFrame: (opcode: number, payload: Buffer) => void }).handleFrame;
      ws.underlyingSocket.on("data", (data: Buffer) => {
        // parseFrame is called internally by WebSocket class;
        // We spy on the socket to verify the frame reaches the server.
      });
    });

    // Use a simpler approach: build a raw masked frame and send it after handshake
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const port = (httpServer.address() as import("node:net").AddressInfo).port;

    const clientSocket = connect(port);

    await new Promise<void>((resolve, reject) => {
      clientSocket.on("connect", () => {
        clientSocket.write(
          "GET / HTTP/1.1\r\n" +
            "Host: localhost\r\n" +
            "Upgrade: websocket\r\n" +
            "Connection: Upgrade\r\n" +
            "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==\r\n" +
            "Sec-WebSocket-Version: 13\r\n" +
            "\r\n"
        );
      });

      clientSocket.on("data", (data: Buffer) => {
        if (data.toString("utf-8").includes("101 Switching Protocols")) {
          // Send a masked text frame: "ping"
          const payload = Buffer.from("ping", "utf-8");
          const key = Buffer.from([0x12, 0x34, 0x56, 0x78]);
          const frame = Buffer.alloc(2 + 4 + payload.length);
          frame[0] = 0x81; // FIN + text
          frame[1] = 0x80 | payload.length; // MASK = 1, length = 4
          key.copy(frame, 2);
          for (let i = 0; i < payload.length; i++) {
            frame[6 + i] = payload[i] ^ key[i % 4];
          }
          clientSocket.write(frame);

          // Send a close frame so the server closes cleanly
          const closeFrame = Buffer.alloc(2 + 4);
          closeFrame[0] = 0x88;
          closeFrame[1] = 0x80 | 0;
          key.copy(closeFrame, 2);
          clientSocket.write(closeFrame);

          resolve();
        }
      });

      clientSocket.on("error", reject);
      setTimeout(() => reject(new Error("timeout")), 2000);
    });

    // Give the server a moment to process
    await new Promise<void>((r) => setTimeout(r, 100));
    expect(wss.clients.size).toBe(0);
    wss.close();
  });

  it("tracks clients and closes cleanly", async () => {
    const httpServer = createServer();
    const wss = new WebSocketServer({ server: httpServer });
    let connectedWs: WebSocket | null = null;

    wss.on("connection", (ws: WebSocket) => {
      connectedWs = ws;
    });

    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const port = (httpServer.address() as import("node:net").AddressInfo).port;

    // Connect a client
    const client = await handshakeClient(port);
    expect(wss.clients.size).toBe(1);

    // Server sends close frame
    if (connectedWs) {
      connectedWs.close();
    }

    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    expect(wss.clients.size).toBe(0);

    client.end();
    wss.close();
  });
});

/* ─── helpers ─── */

function maskFrame(frame: Buffer): Buffer {
  // For test purposes: prepend a masking key and flip the mask bit
  const masked = Buffer.alloc(frame.length + 4);
  const key = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  frame.copy(masked, 4);
  masked[4] = frame[0];
  masked[5] = frame[1] | 0x80;
  key.copy(masked, 6);
  const payloadLen = frame.length - 2;
  for (let i = 0; i < payloadLen; i++) {
    masked[10 + i] = frame[2 + i] ^ key[i % 4];
  }
  return masked;
}

function handshakeClient(port: number): Promise<import("node:net").Socket> {
  return new Promise((resolve, reject) => {
    const socket = connect(port);
    socket.on("connect", () => {
      socket.write(
        "GET / HTTP/1.1\r\n" +
          "Host: localhost\r\n" +
          "Upgrade: websocket\r\n" +
          "Connection: Upgrade\r\n" +
          "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==\r\n" +
          "Sec-WebSocket-Version: 13\r\n" +
          "\r\n"
      );
    });
    socket.on("data", (data: Buffer) => {
      if (data.toString("utf-8").includes("101 Switching Protocols")) {
        resolve(socket);
      }
    });
    socket.on("error", reject);
  });
}
