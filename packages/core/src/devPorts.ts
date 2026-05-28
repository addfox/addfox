import type { RsbuildConfig } from "@rsbuild/core";
import { DEFAULT_DEV_SERVER_PORT, HMR_WS_PORT } from "./constants.js";
import type { AddfoxUserConfig } from "./types.js";

/** Resolve Rsbuild dev server port from static user rsbuild config. */
export function resolveRsbuildDevServerPort(
  rsbuild?: AddfoxUserConfig["rsbuild"]
): number {
  if (typeof rsbuild === "function") return DEFAULT_DEV_SERVER_PORT;
  const port = (rsbuild as RsbuildConfig | undefined)?.server?.port;
  return typeof port === "number" ? port : DEFAULT_DEV_SERVER_PORT;
}

/** Dev-mode connect-src ports: Addfox HMR WS + Rsbuild dev server (for popup/options HMR client). */
export function resolveDevConnectPorts(
  hotReload: AddfoxUserConfig["hotReload"],
  rsbuild?: AddfoxUserConfig["rsbuild"]
): number[] {
  const hotReloadOpts = typeof hotReload === "object" ? hotReload : undefined;
  const hmrPort = hotReloadOpts?.port ?? HMR_WS_PORT;
  const serverPort = resolveRsbuildDevServerPort(rsbuild);
  return [...new Set([hmrPort, serverPort])];
}
