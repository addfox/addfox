/**
 * Re-entrancy depth for stdout/stderr lines emitted while mozilla/web-ext's pino
 * `ConsoleStream.write` is active. Used by CLI output prefixing — not message heuristics.
 */
let webExtStdoutOriginDepth = 0;

export function pushWebExtStdoutOrigin(): void {
  webExtStdoutOriginDepth += 1;
}

export function popWebExtStdoutOrigin(): void {
  webExtStdoutOriginDepth = Math.max(0, webExtStdoutOriginDepth - 1);
}

export function getWebExtStdoutOriginDepth(): number {
  return webExtStdoutOriginDepth;
}
