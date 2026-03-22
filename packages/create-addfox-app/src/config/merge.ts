/**
 * Merges scaffold-time changes into an existing addfox.config from the template
 * (preserves manifest and framework plugins; only injects Less/Sass Rsbuild plugins when selected).
 */

import type { StyleEngine } from "../template/catalog.ts";
import { getStylePlugin } from "./generate.ts";

const MANIFEST_LINE = "  manifest: { chromium: manifest, firefox: { ...manifest } },";

function findMatchingArrayClose(source: string, openBracketIdx: number): number {
  if (source[openBracketIdx] !== "[") return -1;
  let depth = 0;
  for (let i = openBracketIdx; i < source.length; i++) {
    const c = source[i];
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function hasImportFromModule(source: string, modulePath: string): boolean {
  return (
    source.includes(`from "${modulePath}"`) ||
    source.includes(`from '${modulePath}'`) ||
    source.includes(`from \`${modulePath}\``)
  );
}

function insertImportAfterLastImport(source: string, importLine: string): string {
  const trimmed = importLine.trim();
  const moduleMatch = /from\s+["']([^"']+)["']/.exec(trimmed);
  if (moduleMatch && hasImportFromModule(source, moduleMatch[1])) {
    return source;
  }

  const lines = source.split("\n");
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("import ")) {
      lastImportIdx = i;
    }
  }
  if (lastImportIdx === -1) {
    return `${importLine}\n${source}`;
  }
  const next = [...lines];
  next.splice(lastImportIdx + 1, 0, importLine);
  return next.join("\n");
}

function pluginCallPresent(inner: string, call: string): boolean {
  const fn = call.replace(/\(\)$/, "");
  return inner.includes(`${fn}(`);
}

function mergeCallsIntoPluginsArray(source: string, calls: string[]): string {
  const pluginsIdx = source.indexOf("plugins:");
  if (pluginsIdx === -1) {
    return addPluginsBlockAfterManifest(source, calls);
  }
  const bracketStart = source.indexOf("[", pluginsIdx);
  if (bracketStart === -1) {
    return source;
  }
  const bracketEnd = findMatchingArrayClose(source, bracketStart);
  if (bracketEnd === -1) {
    return source;
  }
  let inner = source.slice(bracketStart + 1, bracketEnd).trim();
  for (const c of calls) {
    if (!pluginCallPresent(inner, c)) {
      inner = inner ? `${inner}, ${c}` : c;
    }
  }
  return source.slice(0, bracketStart + 1) + inner + source.slice(bracketEnd);
}

function addPluginsBlockAfterManifest(source: string, calls: string[]): string {
  const idx = source.indexOf(MANIFEST_LINE);
  if (idx === -1) {
    return source;
  }
  const insertPos = idx + MANIFEST_LINE.length;
  return `${source.slice(0, insertPos)}\n  plugins: [${calls.join(", ")}],${source.slice(insertPos)}`;
}

/**
 * After copying a template, merge only Less/Sass Rsbuild plugins into the existing config.
 * Tailwind/UnoCSS need no changes here (postcss + applyStyleEngine). Manifest stays as in template.
 */
export function mergeScaffoldIntoAddfoxConfig(source: string, styleEngine: StyleEngine): string {
  const st = getStylePlugin(styleEngine);
  if (!st) {
    return source;
  }
  let out = insertImportAfterLastImport(source, st.importLine);
  out = mergeCallsIntoPluginsArray(out, [st.call]);
  return out;
}
