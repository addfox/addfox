import { createServer } from "node:http";
import { join } from "node:path";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { WebSocketServer, WebSocket, OPEN } from "../lib/ws";
import { logDone, logDoneTimed, writeExtensionErrorBlock } from "@addfox/common";
import { detectFrontendFramework } from "@addfox/core";
import type { ReloadKind } from "../hmr/scope";

let wsServer: WebSocketServer | null = null;
let httpServer: ReturnType<typeof createServer> | null = null;

/** Stored when startWebSocketServer is called with debug opts; used by error handler. */
let debugServerOpts: DebugServerOpts | null = null;

/** `full`: WebSocket + HTTP (reload + /addfox-error). `httpOnly`: HTTP only for monitor errors (Firefox / debug without Chromium reload). */
export type WsServerMode = "full" | "httpOnly";

export type ExtensionErrorPayload = {
  entry?: string;
  type?: string;
  message?: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  time?: number;
};

export type DebugServerOpts = {
  debug?: boolean;
  root?: string;
  outputRoot?: string;
  distPath?: string;
};

function getBundlerLine(): string {
  return "bundler: rsbuild";
}

function getFrameworkLine(root: string | undefined): string {
  const name = root ? detectFrontendFramework(root) : "Vanilla";
  return `front-end-framework: ${name}`;
}

export function buildExtensionErrorLines(
  payload: ExtensionErrorPayload,
  opts?: DebugServerOpts | null
): string[] {
  const entry = typeof payload.entry === "string" && payload.entry.trim() ? payload.entry.trim() : "unknown";
  const errorType = typeof payload.type === "string" && payload.type.trim() ? payload.type.trim() : "error";
  const timeStr =
    payload.time != null && Number.isFinite(Number(payload.time))
      ? new Date(Number(payload.time)).toLocaleString()
      : new Date().toLocaleString();
  const message = payload.message != null ? String(payload.message) : "Unknown error";
  const stack = payload.stack && String(payload.stack).trim() ? String(payload.stack).trim() : "";
  const filename = payload.filename ? String(payload.filename) : "";
  const lineno = payload.lineno != null && Number.isFinite(Number(payload.lineno)) ? Number(payload.lineno) : undefined;
  const colno = payload.colno != null && Number.isFinite(Number(payload.colno)) ? payload.colno : undefined;
  const loc = filename ? (filename + (lineno != null ? `:${lineno}` : "") + (colno != null ? `:${colno}` : "")) : "";
  const aiPromptLines = buildAiPromptForExtensionRuntimeError().split("\n");
  const lines: string[] = [
    ...aiPromptLines,
    "--- Addfox extension error ---",
    getBundlerLine(),
    getFrameworkLine(opts?.root),
    `entry: ${entry}`,
    `type: ${errorType}`,
    `time: ${timeStr}`,
    `message: ${message}`,
  ];
  if (loc) lines.push(`location: ${loc}`);
  if (stack) lines.push("stack:", ...stack.split("\n"));
  lines.push("---------------------------");
  return lines;
}

function logExtensionErrorToTerminal(payload: ExtensionErrorPayload, opts: DebugServerOpts | null): void {
  writeExtensionErrorBlock(buildExtensionErrorLines(payload, opts));
}

function buildErrorMarkdown(payload: ExtensionErrorPayload, root?: string): string {
  const entry = typeof payload.entry === "string" && payload.entry.trim() ? payload.entry.trim() : "unknown";
  const errorType = typeof payload.type === "string" && payload.type.trim() ? payload.type.trim() : "error";
  const timeStr =
    payload.time != null && Number.isFinite(Number(payload.time))
      ? new Date(Number(payload.time)).toLocaleString()
      : new Date().toLocaleString();
  const message = payload.message != null ? String(payload.message) : "Unknown error";
  const stack = payload.stack && String(payload.stack).trim() ? String(payload.stack).trim() : "";
  const filename = payload.filename ? String(payload.filename) : "";
  const lineno = payload.lineno != null && Number.isFinite(Number(payload.lineno)) ? payload.lineno : undefined;
  const colno = payload.colno != null && Number.isFinite(Number(payload.colno)) ? payload.colno : undefined;
  const loc = filename ? (filename + (lineno != null ? `:${lineno}` : "") + (colno != null ? `:${colno}` : "")) : "";
  const frameworkName = root ? detectFrontendFramework(root) : "Vanilla";

  // Keep markdown output stable: terminal gets the new AI prompt, but error.md keeps the original ai_context.
  const aiContext = [
    "---",
    "ai_context: addfox_extension_error_report",
    "description: Runtime error from the browser extension",
    "when_to_use:",
    "  - User reports extension not working / crashes",
    "  - Console errors in extension context",
    "  - Entry-specific failures (popup/background/content errors)",
    "  - Errors after successful build (runtime vs build issues)",
    "structure:",
    "  - Error summary: entry, type, message, location",
    "  - Build context: bundler and framework info",
    "  - Stack trace: Full error stack for debugging",
    "related_files:",
    "  - llms.txt: Project AI guide (read first if new to project)",
    "  - meta.md: Entry configurations and build outputs",
    "note: This file is cleared on dev server restart",
    "---",
  ].join("\n");

  const summary = [
    "## Error Summary",
    "",
    "| Field | Value |",
    "|-------|-------|",
    `| Entry | \`${entry}\` |`,
    `| Type | \`${errorType}\` |`,
    `| Time | ${timeStr} |`,
    `| Message | ${message} |`,
  ];

  if (loc) {
    summary.push(`| Location | \`${loc}\` |`);
  }

  summary.push("", "## Build Context", "", `- **Bundler**: rsbuild`, `- **Framework**: ${frameworkName}`);

  const parts: string[] = [aiContext, "", ...summary];

  if (stack) {
    parts.push("", "## Stack Trace", "", "```", stack, "```");
  }

  return parts.join("\n");
}

export function buildAiPromptForExtensionRuntimeError(): string {
  // Intentionally kept as a single string block so downstream AI tools
  // can treat it as a "prompt" with minimal parsing.
  return [
    "--- BEGIN AI PROMPT ---",
    "You are a frontend and browser extension development expert, proficient with the Addfox framework.",
    "This is an Addfox-based browser extension runtime error (MV3).",
    "",
    "Before proposing fixes:",
    "1) Read `.addfox/llms.txt` first.",
    "2) Apply the `addfox-debugging` skills to analyze this report (and `.addfox/error.md` / `.addfox/meta.md` if available).",
    "--- END AI PROMPT ---",
  ].join("\n");
}

function getErrorMdPath(root: string, outputRoot: string): string {
  return join(root, outputRoot, "error.md");
}

function deleteErrorMdOnStart(root: string, outputRoot: string): void {
  const path = getErrorMdPath(root, outputRoot);
  if (!existsSync(path)) return;
  unlink(path).catch(() => {});
}

function writeErrorMdAsync(
  root: string,
  outputRoot: string,
  payload: ExtensionErrorPayload
): void {
  const dir = join(root, outputRoot);
  const path = getErrorMdPath(root, outputRoot);
  const content = buildErrorMarkdown(payload, root);
  queueMicrotask(async () => {
    try {
      await mkdir(dir, { recursive: true });
      await writeFile(path, content, "utf-8");
    } catch {
      /* ignore */
    }
  });
}

function handleHttpRequest(
  req: import("node:http").IncomingMessage,
  res: import("node:http").ServerResponse
): void {
  // Allow extension pages (chrome-extension:// / moz-extension://) to post errors.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS" && req.url === "/addfox-error") {
    res.writeHead(204).end();
    return;
  }
  if (req.method === "POST" && req.url === "/addfox-error") {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => { body += chunk; });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body) as ExtensionErrorPayload;
        if (payload && (payload.entry != null || payload.message != null)) {
          const opts = debugServerOpts;
          logExtensionErrorToTerminal(payload, opts);
          if (opts?.debug && opts.root && opts.outputRoot) {
            writeErrorMdAsync(opts.root, opts.outputRoot, payload);
          }
        }
      } catch { /* ignore */ }
      res.writeHead(204).end();
    });
    return;
  }
  res.writeHead(404).end();
}

function bindHttpListen(
  server: ReturnType<typeof createServer>,
  port: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => {
      server.off("error", reject);
      resolve();
    });
  });
}

async function startHttpServerOnly(
  port: number,
  startTime: number,
  opts: DebugServerOpts | null
): Promise<void> {
  debugServerOpts = opts ?? null;
  if (opts?.debug && opts.root && opts.outputRoot) {
    deleteErrorMdOnStart(opts.root, opts.outputRoot);
  }
  const t0 = startTime;
  httpServer = createServer(handleHttpRequest);
  await bindHttpListen(httpServer, port);
  const ms = Math.round(performance.now() - t0);
  logDoneTimed("Addfox debug HTTP (errors): http://127.0.0.1:" + port + "/addfox-error", ms);
}

export async function startWebSocketServer(
  port: number,
  startTime?: number,
  opts?: DebugServerOpts,
  mode: WsServerMode = "full"
): Promise<WebSocketServer | null> {
  if (mode === "httpOnly") {
    if (httpServer || wsServer) return null;
    await startHttpServerOnly(port, startTime ?? performance.now(), opts ?? null);
    return null;
  }
  if (wsServer) return wsServer;
  debugServerOpts = opts ?? null;
  if (opts?.debug && opts.root && opts.outputRoot) {
    deleteErrorMdOnStart(opts.root, opts.outputRoot);
  }
  const t0 = startTime ?? performance.now();
  httpServer = createServer(handleHttpRequest);
  wsServer = new WebSocketServer({ server: httpServer });
  wsServer.on("connection", (ws: WebSocket) => {
    if (ws.readyState === OPEN) ws.send("connected");
  });
  await bindHttpListen(httpServer, port);
  const ms = Math.round(performance.now() - t0);
  logDoneTimed("Hot reload WebSocket: ws://127.0.0.1:" + port, ms);
  return wsServer;
}

export type { ReloadKind } from "../hmr/scope";

export function notifyReload(kind: ReloadKind): void {
  if (!wsServer) return;
  wsServer.clients.forEach((client: WebSocket) => {
    if (client.readyState === OPEN) client.send(kind);
  });
  logDone("hotreload success", kind, new Date().toLocaleString());
}

export function closeWebSocketServer(): void {
  debugServerOpts = null;
  if (wsServer) {
    wsServer.close();
    wsServer = null;
  }
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
}
