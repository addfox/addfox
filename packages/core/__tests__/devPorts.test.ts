import { describe, expect, it } from "@rstest/core";
import { DEFAULT_DEV_SERVER_PORT, HMR_WS_PORT } from "../src/constants.js";
import { resolveDevConnectPorts, resolveRsbuildDevServerPort } from "../src/devPorts.js";

describe("resolveRsbuildDevServerPort", () => {
  it("returns default when rsbuild is undefined", () => {
    expect(resolveRsbuildDevServerPort()).toBe(DEFAULT_DEV_SERVER_PORT);
  });

  it("returns server.port from static rsbuild config", () => {
    expect(resolveRsbuildDevServerPort({ server: { port: 4000 } })).toBe(4000);
  });

  it("returns default when rsbuild is a function", () => {
    expect(resolveRsbuildDevServerPort(() => ({}))).toBe(DEFAULT_DEV_SERVER_PORT);
  });
});

describe("resolveDevConnectPorts", () => {
  it("includes HMR WS port and dev server port by default", () => {
    expect(resolveDevConnectPorts(undefined)).toEqual([HMR_WS_PORT, DEFAULT_DEV_SERVER_PORT]);
  });

  it("uses custom hotReload wsPort", () => {
    expect(resolveDevConnectPorts({ wsPort: 24000 })).toEqual([24000, DEFAULT_DEV_SERVER_PORT]);
  });

  it("uses custom rsbuild server port", () => {
    expect(resolveDevConnectPorts(undefined, { server: { port: 5173 } })).toEqual([
      HMR_WS_PORT,
      5173,
    ]);
  });

  it("uses CLI dev server port before rsbuild config port", () => {
    expect(resolveDevConnectPorts(undefined, { server: { port: 5173 } }, 3001)).toEqual([
      HMR_WS_PORT,
      3001,
    ]);
  });
});
