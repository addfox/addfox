import type { RsbuildConfig } from "@rsbuild/core";
import { DEFAULT_DEV_SERVER_PORT, HMR_WS_PORT } from "./constants.js";
import type { AddfoxUserConfig } from "./types.js";

/** Resolve Rsbuild dev server port from static user rsbuild config. */
export function resolveRsbuildDevServerPort(
  rsbuild?: AddfoxUserConfig["rsbuild"],
  serverPort?: number
): number {
  if (typeof serverPort === "number") return serverPort;
  if (typeof rsbuild === "function") return DEFAULT_DEV_SERVER_PORT;
  const port = (rsbuild as RsbuildConfig | undefined)?.server?.port;
  return typeof port === "number" ? port : DEFAULT_DEV_SERVER_PORT;
}

/** Dev-mode connect-src ports: Addfox HMR WS + Rsbuild dev server (for popup/options HMR client). */
export function resolveDevConnectPorts(
  hotReload: AddfoxUserConfig["hotReload"],
  rsbuild?: AddfoxUserConfig["rsbuild"],
  serverPort?: number
): number[] {
  const hotReloadOpts = typeof hotReload === "object" ? hotReload : undefined;
  const hmrPort = hotReloadOpts?.wsPort ?? HMR_WS_PORT;
  const rsbuildPort = resolveRsbuildDevServerPort(rsbuild, serverPort);
  return [...new Set([hmrPort, rsbuildPort])];
}
