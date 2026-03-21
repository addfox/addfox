/**
 * Entry discovery - finds extension entry points
 */

import { resolve } from "path";
import { existsSync, readdirSync } from "fs";
import type { EntryInfo } from "../types.ts";
import { SCRIPT_EXTS, HTML_ENTRY_NAMES, SCRIPT_ONLY_ENTRY_NAMES } from "../constants.ts";
import {
  getScriptInjectIfMatches,
  parseAddfoxEntryFromHtml,
  resolveScriptFromHtmlStrict,
} from "./html.ts";
import { AddfoxError, ADDFOX_ERROR_CODES } from "@addfox/common";

interface DirContents {
  files: Set<string>;
  dirs: Set<string>;
}

interface DiscoveryOptions {
  scriptExts: readonly string[];
  scriptOnlyNames: readonly string[];
  htmlEntryNames: readonly string[];
}

interface HtmlResolution {
  scriptPath: string;
  inject: EntryInfo["scriptInject"];
}

function readDirContents(dir: string): DirContents | null {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    return {
      files: new Set(entries.filter(e => e.isFile()).map(e => e.name)),
      dirs: new Set(entries.filter(e => e.isDirectory()).map(e => e.name)),
    };
  } catch {
    return null;
  }
}

function findScriptInDir(dir: string, scriptExts: readonly string[]): string | undefined {
  const contents = readDirContents(dir);
  if (!contents) return undefined;
  
  for (const ext of scriptExts) {
    if (contents.files.has(`index${ext}`)) return resolve(dir, `index${ext}`);
  }
  return undefined;
}

function findScriptInDirFromContents(
  dirPath: string,
  contents: DirContents | null,
  scriptExts: readonly string[]
): string | undefined {
  if (!contents) return findScriptInDir(dirPath, scriptExts);
  
  for (const ext of scriptExts) {
    if (contents.files.has(`index${ext}`)) return resolve(dirPath, `index${ext}`);
  }
  return undefined;
}

function findNamedScript(
  baseDir: string,
  name: string,
  scriptExts: readonly string[],
  baseContents: DirContents | null
): string | undefined {
  if (baseContents) {
    for (const ext of scriptExts) {
      if (baseContents.files.has(`${name}${ext}`)) return resolve(baseDir, `${name}${ext}`);
    }
    return undefined;
  }
  
  for (const ext of scriptExts) {
    const p = resolve(baseDir, `${name}${ext}`);
    if (existsSync(p)) return p;
  }
  return undefined;
}

function findNamedHtml(
  baseDir: string,
  name: string,
  baseContents: DirContents | null
): string | undefined {
  if (baseContents) {
    return baseContents.files.has(`${name}.html`) ? resolve(baseDir, `${name}.html`) : undefined;
  }
  const p = resolve(baseDir, `${name}.html`);
  return existsSync(p) ? p : undefined;
}

function isValidScriptExt(pathStr: string, scriptExts: readonly string[]): boolean {
  const lower = pathStr.trim().toLowerCase();
  return scriptExts.some(ext => lower.endsWith(ext));
}

function resolveScriptFromHtmlWithInjectStrict(
  htmlPath: string,
  scriptExts: readonly string[]
): HtmlResolution {
  const resolved = resolveScriptFromHtmlStrict(htmlPath);
  if (!isValidScriptExt(resolved.scriptPath, scriptExts)) {
    throw new AddfoxError({
      code: ADDFOX_ERROR_CODES.ENTRY_SCRIPT_FROM_HTML,
      message: "Invalid data-addfox-entry script in HTML",
      details: `HTML: ${htmlPath}. Resolved path is not a supported script: ${resolved.scriptPath}`,
      hint: "data-addfox-entry script must have a relative src and the file must exist",
    });
  }
  return resolved;
}

function tryResolveEntryFromHtml(
  htmlPath: string,
  scriptExts: readonly string[]
): HtmlResolution | undefined {
  try {
    const parsed = parseAddfoxEntryFromHtml(htmlPath);
    if (!parsed) return undefined;
    return resolveScriptFromHtmlWithInjectStrict(htmlPath, scriptExts);
  } catch (e) {
    throw new AddfoxError({
      code: ADDFOX_ERROR_CODES.ENTRY_SCRIPT_FROM_HTML,
      message: "Invalid data-addfox-entry script in HTML",
      details: `HTML: ${htmlPath}. ${e instanceof Error ? e.message : String(e)}`,
      hint: "data-addfox-entry script must have a relative src and the file must exist",
    });
  }
}

function buildHtmlEntryInfo(
  name: string,
  htmlPath: string,
  conventionalScriptPath: string | undefined,
  scriptExts: readonly string[]
): EntryInfo | null {
  const fromHtml = tryResolveEntryFromHtml(htmlPath, scriptExts);
  
  if (fromHtml) {
    return {
      name,
      scriptPath: fromHtml.scriptPath,
      htmlPath,
      html: true,
      scriptInject: fromHtml.inject,
      outputFollowsScriptPath: true,
    };
  }
  
  if (!conventionalScriptPath) return null;
  
  return {
    name,
    scriptPath: conventionalScriptPath,
    htmlPath,
    html: true,
    scriptInject: getScriptInjectIfMatches(htmlPath, conventionalScriptPath),
  };
}

function discoverScriptOnlyEntry(
  baseDir: string,
  name: string,
  contents: DirContents | null,
  options: DiscoveryOptions
): EntryInfo | null {
  const singleScript = findNamedScript(baseDir, name, options.scriptExts, contents);
  if (singleScript) return { name, scriptPath: singleScript, html: false };

  if (!contents?.dirs.has(name)) return null;
  
  const scriptPath = findScriptInDir(resolve(baseDir, name), options.scriptExts);
  return scriptPath ? { name, scriptPath, html: false } : null;
}

function discoverHtmlEntryFromFlat(
  baseDir: string,
  name: string,
  contents: DirContents | null,
  options: DiscoveryOptions
): EntryInfo | null {
  const singleScript = findNamedScript(baseDir, name, options.scriptExts, contents);
  const singleHtml = findNamedHtml(baseDir, name, contents);

  if (singleScript && singleHtml) {
    return buildHtmlEntryInfo(name, singleHtml, singleScript, options.scriptExts);
  }
  
  if (singleHtml) {
    const conventional = findNamedScript(baseDir, name, options.scriptExts, contents);
    return buildHtmlEntryInfo(name, singleHtml, conventional, options.scriptExts);
  }
  
  return null;
}

function discoverHtmlEntryFromDir(
  baseDir: string,
  name: string,
  contents: DirContents | null,
  options: DiscoveryOptions
): EntryInfo | null {
  if (!contents?.dirs.has(name)) return null;

  const dirPath = resolve(baseDir, name);
  const subContents = readDirContents(dirPath);
  const htmlPath = subContents?.files.has("index.html")
    ? resolve(dirPath, "index.html")
    : undefined;
  const scriptPath = findScriptInDirFromContents(dirPath, subContents, options.scriptExts);

  if (scriptPath && htmlPath) {
    return buildHtmlEntryInfo(name, htmlPath, scriptPath, options.scriptExts);
  }
  
  if (scriptPath) {
    return {
      name,
      scriptPath,
      htmlPath,
      html: true,
      scriptInject: htmlPath ? getScriptInjectIfMatches(htmlPath, scriptPath) : undefined,
    };
  }
  
  if (!htmlPath) return null;
  
  return buildHtmlEntryInfo(name, htmlPath, undefined, options.scriptExts);
}

function discoverHtmlEntry(
  baseDir: string,
  name: string,
  contents: DirContents | null,
  options: DiscoveryOptions
): EntryInfo | null {
  return (
    discoverHtmlEntryFromFlat(baseDir, name, contents, options) ??
    discoverHtmlEntryFromDir(baseDir, name, contents, options)
  );
}

function discoverEntriesInternal(baseDir: string, options: DiscoveryOptions): EntryInfo[] {
  const contents = readDirContents(baseDir);
  const entries: EntryInfo[] = [];

  for (const name of options.scriptOnlyNames) {
    const entry = discoverScriptOnlyEntry(baseDir, name, contents, options);
    if (entry) entries.push(entry);
  }

  for (const name of options.htmlEntryNames) {
    const entry = discoverHtmlEntry(baseDir, name, contents, options);
    if (entry) entries.push(entry);
  }

  return entries;
}

export interface EntryDiscovererOptions {
  scriptExts?: readonly string[];
  scriptOnlyNames?: readonly string[];
  htmlEntryNames?: readonly string[];
}

function createOptions(options: EntryDiscovererOptions = {}): DiscoveryOptions {
  return {
    scriptExts: options.scriptExts ?? SCRIPT_EXTS,
    scriptOnlyNames: options.scriptOnlyNames ?? SCRIPT_ONLY_ENTRY_NAMES,
    htmlEntryNames: options.htmlEntryNames ?? HTML_ENTRY_NAMES,
  };
}

export function discoverEntries(baseDir: string, options?: EntryDiscovererOptions): EntryInfo[] {
  return discoverEntriesInternal(baseDir, createOptions(options));
}

export function getHtmlEntryNames(options?: Pick<EntryDiscovererOptions, 'htmlEntryNames'>): string[] {
  return [...(options?.htmlEntryNames ?? HTML_ENTRY_NAMES)];
}

export function getScriptOnlyEntryNames(options?: Pick<EntryDiscovererOptions, 'scriptOnlyNames'>): string[] {
  return [...(options?.scriptOnlyNames ?? SCRIPT_ONLY_ENTRY_NAMES)];
}

export function getAllEntryNames(options?: EntryDiscovererOptions): string[] {
  return [...getHtmlEntryNames(options), ...getScriptOnlyEntryNames(options)];
}

