import { resolve, sep } from "path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { ChromiumLaunchTarget } from "@addfox/core";

/** Cache directory for browser profiles */
const BROWSER_PROFILE_DIR = "browser-profile";
const DEFAULT_OUTPUT_ROOT = ".addfox";

function splitPathSegments(path: string): string[] {
  return resolve(path)
    .split(/[\\/]+/)
    .filter(Boolean);
}

function resolveCacheRootByOutputRoot(distPath: string, outputRoot: string): string | null {
  const rootName = outputRoot.replace(/^[/\\]+|[/\\]+$/g, "");
  if (!rootName) return null;

  const parts = splitPathSegments(distPath);
  const rootIndex = parts.lastIndexOf(rootName);
  if (rootIndex < 0) return null;

  const prefix = parts.slice(0, rootIndex + 1).join(sep);
  const hasDrivePrefix = /^[a-zA-Z]:$/.test(parts[0] ?? "");
  const normalizedPrefix = hasDrivePrefix ? prefix : `${sep}${prefix}`;
  return resolve(normalizedPrefix, "cache");
}

/** Get the cache root directory (parent of distPath/cache) */
export function getCacheRoot(distPath: string, outputRoot = DEFAULT_OUTPUT_ROOT): string {
  const resolved = resolveCacheRootByOutputRoot(distPath, outputRoot);
  if (resolved) return resolved;
  return resolve(distPath, "..", "cache");
}

/** Get the browser profile directory path */
export function getBrowserProfileDir(distPath: string, outputRoot = DEFAULT_OUTPUT_ROOT): string {
  return resolve(getCacheRoot(distPath, outputRoot), BROWSER_PROFILE_DIR);
}

/** @deprecated Use getBrowserProfileDir instead */
export function getCacheTempRoot(distPath: string, outputRoot = DEFAULT_OUTPUT_ROOT): string {
  return getBrowserProfileDir(distPath, outputRoot);
}

export function getChromiumUserDataDir(
  distPath: string,
  browser: ChromiumLaunchTarget,
  outputRoot = DEFAULT_OUTPUT_ROOT
): string {
  return resolve(getBrowserProfileDir(distPath, outputRoot), `${browser}-user-data`);
}

export function getReloadManagerPath(distPath: string, outputRoot = DEFAULT_OUTPUT_ROOT): string {
  return resolve(getCacheRoot(distPath, outputRoot), "reload-manager-extension");
}

export function findExistingReloadManager(distPath: string, outputRoot = DEFAULT_OUTPUT_ROOT): string | null {
  const cacheRoot = getCacheRoot(distPath, outputRoot);
  if (!existsSync(cacheRoot)) return null;
  const extPath = getReloadManagerPath(distPath, outputRoot);
  const manifestPath = resolve(extPath, "manifest.json");
  const bgPath = resolve(extPath, "bg.js");
  if (existsSync(manifestPath) && existsSync(bgPath)) return extPath;
  return null;
}

const RELOAD_MANAGER_SCRIPT_VERSION = 12;

export async function ensureDistReady(distPath: string, timeoutMs = 2000): Promise<boolean> {
  const { statSync } = await import("node:fs");
  const manifestPath = resolve(distPath, "manifest.json");
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (existsSync(manifestPath) && statSync(manifestPath).size > 0) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`dist not ready: ${manifestPath}`);
}

export async function createReloadManagerExtension(
  wsPort: number,
  distPath: string,
  browser?: string
): Promise<string> {
  const extPath = getReloadManagerPath(distPath);
  const bgJsPath = resolve(extPath, "bg.js");
  const portCachePath = resolve(extPath, ".port-cache");
  const scriptVersionPath = resolve(extPath, ".script-version");
  const isGecko = browser === "firefox" || browser === "zen";
  let needsUpdate = true;
  if (existsSync(portCachePath) && existsSync(scriptVersionPath)) {
    try {
      const cachedPort = parseInt(await readFile(portCachePath, "utf-8"), 10);
      const cachedVer = parseInt(await readFile(scriptVersionPath, "utf-8"), 10);
      if (cachedPort === wsPort && cachedVer === RELOAD_MANAGER_SCRIPT_VERSION) needsUpdate = false;
    } catch { /* ignore */ }
  }
  await mkdir(extPath, { recursive: true });
  if (needsUpdate) {
    await writeFile(
      resolve(extPath, "manifest.json"),
      JSON.stringify(
        {
          manifest_version: 3,
          name: "Reload Manager",
          version: "1.0",
          permissions: ["management", "tabs", "alarms"],
          host_permissions: ["<all_urls>"],
          background: isGecko ? { scripts: ["bg.js"] } : { service_worker: "bg.js" },
          content_security_policy: {
            extension_pages: `script-src 'self'; object-src 'self'; connect-src 'self' ws://127.0.0.1:${wsPort};`,
          },
          browser_specific_settings: {
            gecko: {
              id: "reload-manager@addfox.local",
            },
          },
        },
        null,
        2
      ),
      "utf-8"
    );
    const toggleLogic = isGecko
      ? `// Gecko: setEnabled is blocked for temporary addons.
        // Request the CLI to reload the addon via RDP (re-install) instead.
        try {
          if (ws && ws.readyState === WebSocket.OPEN) {
            console.log("[ReloadManager] Requesting CLI RDP reload");
            ws.send("firefox-reload-addon");
          }
        } catch (err) {
          console.error("[ReloadManager] RDP reload request failed:", err);
        }`
      : `// Chromium: Toggle extensions via management API.
        const all = await chrome.management.getAll();
        console.log("[ReloadManager] Found extensions:", all.length);
        let toggled = 0;
        for (const x of all) {
          if (!x.enabled || x.id === chrome.runtime.id) continue;
          console.log("[ReloadManager] Checking:", x.name, "installType:", x.installType);
          if (x.installType !== "development") {
            console.log("[ReloadManager] Skipping (not development):", x.name);
            continue;
          }
          try {
            console.log("[ReloadManager] Toggling:", x.name);
            await chrome.management.setEnabled(x.id, false);
            await new Promise(r => setTimeout(r, 100));
            await chrome.management.setEnabled(x.id, true);
            toggled++;
            console.log("[ReloadManager] Toggled:", x.name);
          } catch (err) {
            console.error("[ReloadManager] Toggle failed:", x.name, err);
          }
        }
        console.log("[ReloadManager] Total toggled:", toggled);`;

    const bgJs = `
// Reload Manager Service Worker - MV3 Compatible
const WS_URL = "ws://127.0.0.1:${wsPort}";
const ALARM_NAME = "reload-manager-keepalive";
const RECONNECT_DELAY = 3000;
const KEEPALIVE_INTERVAL = 20; // seconds, must be < 30s to prevent SW termination

let ws = null;
let isConnecting = false;

function canReloadTab(tab) {
  if (!tab || !tab.url) return false;
  const u = tab.url;
  return u.startsWith("http://") || u.startsWith("https://") || u.startsWith("file://");
}

async function ensureAlarm() {
  try {
    const alarm = await chrome.alarms.get(ALARM_NAME);
    if (!alarm) {
      await chrome.alarms.create(ALARM_NAME, { periodInMinutes: KEEPALIVE_INTERVAL / 60 });
    }
  } catch (e) {}
}

function cleanupConnection() {
  isConnecting = false;
  if (ws) {
    try { ws.close(); } catch (e) {}
    ws = null;
  }
}

async function connect() {
  if (isConnecting || (ws && ws.readyState === WebSocket.OPEN)) return;

  isConnecting = true;
  cleanupConnection();

  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      isConnecting = false;
      ensureAlarm();
    };

    ws.onmessage = async (e) => {
      const msg = String(e.data == null ? "" : e.data);
      if (msg === "connected") return;

      // HTML entry (popup/options) changes: only refresh extension pages, do NOT reload the extension.
      if (msg === "reload-extension") {
        try {
          const allTabs = await chrome.tabs.query({});
          for (const tab of allTabs) {
            if (tab.url && (tab.url.startsWith("moz-extension://") || tab.url.startsWith("chrome-extension://"))) {
              console.log("[ReloadManager] Reloading extension page:", tab.url);
              await chrome.tabs.reload(tab.id, { bypassCache: true });
            }
          }
        } catch (err) {
          console.error("[ReloadManager] Extension pages reload failed:", err);
        }
        return;
      }

      // Content/background script changes: reload the extension itself.
      const isContentBgChange = msg === "toggle-extension" || msg === "toggle-extension-refresh-page" || msg === "toggle-extension-refresh-tab";
      if (!isContentBgChange) return;

      console.log("[ReloadManager] Received:", msg);

      ${toggleLogic}

      // Refresh active tab if requested.
      if (msg === "toggle-extension-refresh-page" || msg === "toggle-extension-refresh-tab") {
        await new Promise(r => setTimeout(r, 200));
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          console.log("[ReloadManager] Active tab:", tab?.url);
          if (tab?.id && canReloadTab(tab)) {
            console.log("[ReloadManager] Reloading tab with bypassCache");
            await chrome.tabs.reload(tab.id, { bypassCache: true });
            console.log("[ReloadManager] Tab reloaded");
          } else {
            console.log("[ReloadManager] Skipping tab reload (not reloadable)");
          }
        } catch (err) {
          console.error("[ReloadManager] Tab reload failed:", err);
        }
      }
    };

    ws.onclose = () => {
      cleanupConnection();
      scheduleReconnect();
    };

    ws.onerror = () => {
      cleanupConnection();
    };
  } catch (err) {
    cleanupConnection();
    scheduleReconnect();
  }
}

let reconnectTimeout = null;
function scheduleReconnect() {
  if (reconnectTimeout) return;
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connect();
  }, RECONNECT_DELAY);
}

// Alarm listener to keep service worker alive and check connection
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connect();
    }
  }
});

// Listen for external messages (can be used to wake up service worker)
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request && request.action === "ping") {
    sendResponse({ status: "ok", connected: ws && ws.readyState === WebSocket.OPEN });
  }
  return true;
});

// Connect on startup (browser restart)
chrome.runtime.onStartup.addListener(() => {
  ensureAlarm();
  connect();
});

// Connect on install/update
chrome.runtime.onInstalled.addListener(() => {
  ensureAlarm();
  connect();
});

// Initial connection
ensureAlarm();
connect();
`;
    await writeFile(bgJsPath, bgJs, "utf-8");
    await writeFile(portCachePath, String(wsPort), "utf-8");
    await writeFile(scriptVersionPath, String(RELOAD_MANAGER_SCRIPT_VERSION), "utf-8");
  }
  return extPath;
}
