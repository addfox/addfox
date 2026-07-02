import { resolve } from "path";
import type { Compiler } from "@rspack/core";
import type { EntryInfo } from "@addfox/core";

interface HtmlOutputMap {
  html: Record<string, string>;
}

const NO_HTML_ENTRIES = new Set(["background", "content"]);

type ExtendedCompiler = Compiler & {
  modifiedFiles?: ReadonlySet<string>;
  watchFileSystem?: {
    watcher?: {
      mtimes?: Map<string, number> | Record<string, number>;
      getTimes?: () => Map<string, number> | Record<string, number>;
    };
  };
};

function entryBuildsHtmlPage(entry: EntryInfo): boolean {
  if (NO_HTML_ENTRIES.has(entry.name)) return false;
  return entry.html === true || entry.htmlPath != null;
}

export function normalizePathForCompare(filePath: string): string {
  return resolve(filePath).replace(/\\/g, "/").toLowerCase();
}

export function toFullReloadHtmlPath(outputHtml: string): string {
  const webPath = outputHtml.replace(/\\/g, "/");
  return webPath.startsWith("/") ? webPath : `/${webPath}`;
}

export function buildHtmlTemplateReloadPathMap(
  entries: EntryInfo[],
  outputMap: HtmlOutputMap
): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of entries) {
    if (!entry.htmlPath || !entryBuildsHtmlPage(entry)) continue;
    const outputHtml = outputMap.html[entry.name];
    if (!outputHtml) continue;
    map.set(normalizePathForCompare(entry.htmlPath), toFullReloadHtmlPath(outputHtml));
  }
  return map;
}

export function collectHtmlReloadPaths(
  modifiedFiles: ReadonlySet<string>,
  templateReloadPaths: ReadonlyMap<string, string>
): string[] {
  const reloadPaths = new Set<string>();
  for (const file of modifiedFiles) {
    if (!/\.html?$/i.test(file) || file.includes(".addfox")) continue;
    const reloadPath = templateReloadPaths.get(normalizePathForCompare(file));
    if (reloadPath) reloadPaths.add(reloadPath);
  }
  return [...reloadPaths];
}

export function getModifiedFilesFromCompiler(compiler: Compiler | null): Set<string> {
  const out = new Set<string>();
  if (!compiler) return out;

  const extended = compiler as ExtendedCompiler;
  if (extended.modifiedFiles?.size) {
    extended.modifiedFiles.forEach((filePath) => out.add(filePath));
    return out;
  }

  const watcher = extended.watchFileSystem?.watcher;
  if (!watcher) return out;

  try {
    const mtimes = watcher.mtimes ?? watcher.getTimes?.();
    if (!mtimes) return out;
    if (mtimes instanceof Map) {
      mtimes.forEach((_, key) => out.add(key));
    } else {
      Object.keys(mtimes).forEach((key) => out.add(key));
    }
  } catch {
    /* ignore watcher access errors */
  }

  return out;
}

export function statsHasErrors(stats: unknown): boolean {
  if (!stats || typeof stats !== "object") return true;
  const hasErrors = (stats as { hasErrors?: () => boolean }).hasErrors;
  return typeof hasErrors === "function" ? hasErrors.call(stats) : false;
}

export type HtmlFullReloadSender = (type: "full-reload", data?: { path?: string }) => void;

export function notifyHtmlTemplateFullReload(
  modifiedFiles: ReadonlySet<string>,
  templateReloadPaths: ReadonlyMap<string, string>,
  sockWrite: HtmlFullReloadSender
): void {
  for (const path of collectHtmlReloadPaths(modifiedFiles, templateReloadPaths)) {
    sockWrite("full-reload", { path });
  }
}
