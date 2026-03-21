import { test, expect } from "@playwright/test";
import WebSocket from "ws";
import {
  createTestWsServer,
  getBrowserPath,
  type LaunchPathOptions,
} from "@addfox/rsbuild-plugin-extension-hmr";

const HMR_TEST_PORT = 30901;

test.describe("plugin-extension-hmr", () => {
  test("WebSocket server accepts connection and sends connected", async () => {
    const server = await createTestWsServer(HMR_TEST_PORT);
    const ws = new WebSocket(`ws://localhost:${HMR_TEST_PORT}`);
    try {
      const first = await Promise.race([
        new Promise<string>((resolve, reject) => {
          ws.on("message", (data: Buffer) => resolve(data.toString()));
          ws.on("error", reject);
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("ws message timeout")), 5000)
        ),
      ]);
      expect(first).toBe("connected");
    } finally {
      ws.close();
      await server.close();
    }
  });

  test("notifyReload broadcasts reload-extension to connected client", async () => {
    const port = HMR_TEST_PORT + 1;
    const server = await createTestWsServer(port);
    const ws = new WebSocket(`ws://localhost:${port}`);
    try {
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          ws.on("message", (data: Buffer) => {
            if (data.toString() === "connected") resolve();
          });
          ws.on("error", reject);
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("connected timeout")), 5000)
        ),
      ]);
      server.notifyReload();
      const reload = await Promise.race([
        new Promise<string>((resolve, reject) => {
          ws.on("message", (data: Buffer) => resolve(data.toString()));
          ws.on("error", reject);
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("reload-extension timeout")), 5000)
        ),
      ]);
      expect(reload).toBe("reload-extension");
    } finally {
      ws.close();
      await server.close();
    }
  });

  test("getBrowserPath returns custom chromePath when provided", () => {
    const custom = "C:\\custom\\chrome.exe";
    const opts: LaunchPathOptions = { chromePath: custom };
    const path = getBrowserPath("chrome", opts);
    expect(path).toBe(custom);
  });

  test("getBrowserPath returns custom edgePath when provided", () => {
    const custom = "/usr/bin/edge";
    const opts: LaunchPathOptions = { edgePath: custom };
    const path = getBrowserPath("edge", opts);
    expect(path).toBe(custom);
  });
});
