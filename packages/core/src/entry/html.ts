import { resolve, dirname } from "path";
import { readFileSync, existsSync } from "fs";
import type { ScriptInjectPosition } from "../types.ts";

export type { ScriptInjectPosition };

export interface AddfoxEntryScriptResult {
  /** Resolved src attribute value (relative path) */
  src: string;
  /** Where the script tag sits: head or body */
  inject: ScriptInjectPosition;
  /** HTML content with the data-addfox-entry script tag removed */
  strippedHtml: string;
}

/** True if src is a relative path (no leading / or \, no protocol). */
export function isScriptSrcRelative(src: string): boolean {
  const t = src.trim();
  if (t.startsWith("/") || t.startsWith("\\")) return false;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return false;
  return true;
}

const ENTRY_SCRIPT_REGEX =
  /<script\b[^>]*data-addfox-entry[^>]*>[\s\S]*?<\/script>/gi;
const HEAD_CLOSE_REGEX = /<\/head\s*>/i;

/** Matches a single script tag with src attribute (for fallback). */
const SCRIPT_WITH_SRC_REGEX =
  /<script\b[^>]*\ssrc\s*=\s*["']([^"']+)["'][^>]*>[\s\S]*?<\/script>/gi;

/**
 * Finds the first <script src="..."> in HTML (head or body) with protocol-less src.
 * Returns { src, fullTag, tagStartIndex } or undefined.
 */
function findFirstScriptWithRelativeSrc(html: string): { src: string; fullTag: string; tagStartIndex: number } | undefined {
  const reg = new RegExp(SCRIPT_WITH_SRC_REGEX.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = reg.exec(html)) !== null) {
    const src = match[1];
    if (!isScriptSrcRelative(src)) continue;
    return { src, fullTag: match[0], tagStartIndex: match.index };
  }
  return undefined;
}

/**
 * Parses HTML at htmlPath for the entry script.
 * Entry is either: (1) script with data-addfox-entry and protocol-less src, or
 * (2) if none found, the first script in HTML (head or body) with protocol-less src.
 * Returns src, inject position (head vs body), and HTML with that script tag removed.
 * If no such tag is found or it has no valid src, returns undefined.
 */
export function parseAddfoxEntryFromHtml(
  htmlPath: string
): AddfoxEntryScriptResult | undefined {
  const raw = readFileSync(htmlPath, "utf-8");

  const reg = new RegExp(ENTRY_SCRIPT_REGEX.source, "gi");
  const match = reg.exec(raw);
  if (match) {
    const tag = match[0];
    const tagStartIndex = match.index;
    const srcMatch = tag.match(/src\s*=\s*["']([^"']+)["']/i);
    if (srcMatch?.[1] && isScriptSrcRelative(srcMatch[1])) {
      const src = srcMatch[1];
      const headCloseMatch = raw.match(HEAD_CLOSE_REGEX);
      const headCloseIndex = headCloseMatch?.index ?? -1;
      const inject: ScriptInjectPosition =
        headCloseIndex >= 0 && tagStartIndex < headCloseIndex ? "head" : "body";
      const strippedHtml = raw.replace(ENTRY_SCRIPT_REGEX, "").trimEnd();
      return { src, inject, strippedHtml };
    }
  }

  const fallback = findFirstScriptWithRelativeSrc(raw);
  if (!fallback) return undefined;
  const headCloseMatch = raw.match(HEAD_CLOSE_REGEX);
  const headCloseIndex = headCloseMatch?.index ?? -1;
  const inject: ScriptInjectPosition =
    headCloseIndex >= 0 && fallback.tagStartIndex < headCloseIndex ? "head" : "body";
  const strippedHtml = raw.replace(fallback.fullTag, "").trimEnd();
  return {
    src: fallback.src,
    inject,
    strippedHtml,
  };
}

/**
 * If html has data-addfox-entry and its script src resolves to the same path as scriptPath,
 * returns the inject position so the entry can use stripped template and html.inject.
 */
export function getScriptInjectIfMatches(
  htmlPath: string,
  scriptPath: string
): ScriptInjectPosition | undefined {
  try {
    const parsed = parseAddfoxEntryFromHtml(htmlPath);
    if (!parsed) return undefined;
    const resolvedFromHtml = resolve(dirname(htmlPath), parsed.src);
    return resolvedFromHtml === scriptPath ? parsed.inject : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve script path from HTML that has data-addfox-entry with src.
 * - src must be relative; throws if absolute.
 * - Resolved file must exist; throws if not found.
 * Use this when the entry is driven by HTML so invalid config fails fast.
 */
export function resolveScriptFromHtmlStrict(htmlPath: string): {
  scriptPath: string;
  inject: ScriptInjectPosition;
} {
  const parsed = parseAddfoxEntryFromHtml(htmlPath);
  if (!parsed) {
    throw new Error(
      "data-addfox-entry script must have a src attribute (relative path)"
    );
  }
  if (!isScriptSrcRelative(parsed.src)) {
    throw new Error(
      `data-addfox-entry src must be relative, got: ${JSON.stringify(parsed.src)}`
    );
  }
  const scriptPath = resolve(dirname(htmlPath), parsed.src);
  if (!existsSync(scriptPath)) {
    throw new Error(`Entry script not found: ${scriptPath}`);
  }
  return { scriptPath, inject: parsed.inject };
}
