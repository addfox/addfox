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

const RELOAD_MANAGER_SCRIPT_VERSION = 3;

export async function ensureDistReady(distPath: string, timeoutMs = 15000): Promise<boolean> {
  const { statSync } = await import("node:fs");
  const manifestPath = resolve(distPath, "manifest.json");
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (existsSync(manifestPath) && statSync(manifestPath).size > 0) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`dist not ready: ${manifestPath}`);
}

export async function createReloadManagerExtension(wsPort: number, distPath: string): Promise<string> {
  const extPath = getReloadManagerPath(distPath);
  const bgJsPath = resolve(extPath, "bg.js");
  const portCachePath = resolve(extPath, ".port-cache");
  const scriptVersionPath = resolve(extPath, ".script-version");
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
          permissions: ["management", "tabs"],
          background: { service_worker: "bg.js" },
        },
        null,
        2
      ),
      "utf-8"
    );
    const bgJs = `
let ws=null,rt=null;
function canReloadTab(tab){
  if(!tab||!tab.url)return false;
  const u=tab.url;
  return u.startsWith("http://")||u.startsWith("https://")||u.startsWith("file://");
}
function connect(){
  try{if(ws)ws.close();
  ws=new WebSocket("ws://localhost:${wsPort}");
  ws.onopen=()=>{if(rt)clearInterval(rt);rt=null;};
  ws.onmessage=async(e)=>{
    const msg=String(e.data==null?"":e.data);
    if(msg==="connected")return;
    if(msg==="reload-extension")return;
    const refreshPage=msg==="toggle-extension-refresh-page"||msg==="toggle-extension-refresh-tab";
    if(msg==="toggle-extension"||refreshPage){
      const all=await chrome.management.getAll();
      for(const x of all){
        if(x.enabled&&x.installType==="development"&&x.id!==chrome.runtime.id){
          try{await chrome.management.setEnabled(x.id,false);
          await new Promise(r=>setTimeout(r,100));
          await chrome.management.setEnabled(x.id,true);}catch(err){}
        }
      }
      if(refreshPage){
        await new Promise(r=>setTimeout(r,200));
        try{
          const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
          if(tab?.id&&canReloadTab(tab))await chrome.tabs.reload(tab.id);
        }catch(err){}
      }
    }
  };
  ws.onclose=()=>{if(!rt)rt=setInterval(connect,3000);};
  }catch(err){}
}
 connect();
`;
    await writeFile(bgJsPath, bgJs, "utf-8");
    await writeFile(portCachePath, String(wsPort), "utf-8");
    await writeFile(scriptVersionPath, String(RELOAD_MANAGER_SCRIPT_VERSION), "utf-8");
  }
  return extPath;
}
