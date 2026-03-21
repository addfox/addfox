import type { Compiler } from "@rspack/core";
import type { RsbuildPluginAPI } from "@rsbuild/core";
import { resolve } from "path";
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { writeFile as writeFileAsync } from "fs/promises";
import type {
  AddfoxResolvedConfig,
  EntryInfo,
  BrowserTarget,
  ManifestRecord,
  ContentScriptOutput,
} from "@addfox/core";
import { resolveManifestForTarget, getAddfoxVersion } from "@addfox/core";

const CONTENT_CSS_GLOBAL_KEY = "__ADDFOX_CONTENT_CSS_FILES__";
const CONTENT_CSS_TEXTS_GLOBAL_KEY = "__ADDFOX_CONTENT_CSS_TEXTS__";

const REQUIRED_HTML_ENTRIES = new Set(["popup", "options", "sidepanel", "offscreen"]);

const CONTENT_CSS_PATTERN = /defineShadowContentUI|defineIframeContentUI/;
const CONTENT_WRAPPER_PATTERN = /wrapper\s*:\s*["'](?:shadow|iframe)["']/;

const CONTENT_JS_PATTERNS = [
  (k: string) => k.startsWith("content/") && k.endsWith(".js"),
  (k: string) => k === "content.js",
];

const CONTENT_CSS_PATTERNS = [
  (k: string) => (k.startsWith("content/") && k.endsWith(".css")) || k === "content.css",
  (k: string) => k.startsWith("static/css/content"),
];

type ContentScriptOutputWithPolicy = ContentScriptOutput & {
  autoFillCssInManifest?: boolean;
};

type EntrypointLike = { getFiles?: () => ReadonlyArray<string> };
type EntrypointsMap = Map<string, EntrypointLike>;
type EntrypointsRecord = Record<string, EntrypointLike>;
type CompilationLike = {
  entrypoints?: unknown;
  assets?: Record<string, unknown>;
  getAssets?: () => ReadonlyArray<{ filename?: string; name?: string }>;
};
type AssetLike = { filename?: string; name?: string };

/**
 * Writes manifest.json after build. Entry and HTML (html: false for background/content) are handled by plugin-extension-entry.
 * Browser comes from CLI -l/--launch (config/constants), not from env.
 * 
 * @param resolvedConfig - Resolved Addfox configuration
 * @param entries - Discovered entries
 * @param browser - Target browser (chromium or firefox)
 * @param distPath - Output directory path (browser-specific, e.g., .addfox/extension/extension-chromium)
 */
export function extensionPlugin(
  resolvedConfig: AddfoxResolvedConfig,
  entries: EntryInfo[],
  browser: BrowserTarget,
  distPath: string
) {
  const { root, outputRoot, manifest } = resolvedConfig;
  const metaDir = resolve(root, outputRoot);

  return {
    name: "rsbuild-plugin-extension-manifest",
    setup(api: RsbuildPluginAPI) {
      api.onBeforeCreateCompiler(async ({ bundlerConfigs }) => {
        const config = bundlerConfigs[0];
        if (!config) return;

        config.plugins = config.plugins ?? [];
        config.plugins.push(createManifestPlugin(distPath, metaDir, manifest, entries, browser));
      });
    },
  };
}

function createManifestPlugin(
  distPath: string,
  metaDir: string,
  manifest: AddfoxResolvedConfig["manifest"],
  entries: EntryInfo[],
  browser: BrowserTarget
) {
  return {
    name: "rsbuild-plugin-extension-manifest:post-build",
    apply(compiler: Compiler) {
      compiler.hooks.afterEmit.tap("rsbuild-plugin-extension-manifest:post-build", (compilation) => {
        emitManifest(distPath, metaDir, manifest, entries, browser, compilation);
      });
    },
  };
}

function emitManifest(
  distPath: string,
  metaDir: string,
  manifest: AddfoxResolvedConfig["manifest"],
  entries: EntryInfo[],
  browser: BrowserTarget,
  compilation?: CompilationLike
): void {
  ensureDir(distPath);

  const safeCompilation: CompilationLike = compilation ?? {};
  const contentScriptOutput = collectContentScriptOutput(safeCompilation, entries);
  injectContentCssRuntimeMeta(distPath, contentScriptOutput);

  const manifestObj = resolveManifestForTarget(
    manifest,
    entries,
    browser,
    console.warn,
    contentScriptOutput
  );

  const finalManifest = applyContentCssManifestPolicy(
    manifestObj,
    manifest,
    browser,
    contentScriptOutput
  );

  validateEntryHtmlRules(entries, finalManifest);
  writeManifestJson(distPath, finalManifest);

  // Extract entrypoints mapping for AI context
  const entrypointsMap = extractEntrypointsMap(safeCompilation, entries);

  // Fire-and-forget meta.md and llms.txt generation for AI consumption
  void Promise.all([
    writeMetaMarkdown(metaDir, finalManifest, entries, entrypointsMap),
    writeLlmsTxt(metaDir, finalManifest, entries),
  ]).catch(() => {
    // Intentionally ignore write errors to keep build/dev unaffected.
  });
}

function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

function writeManifestJson(distPath: string, manifest: ManifestRecord): void {
  const manifestPath = resolve(distPath, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
}

/**
 * Collect content entry js and css for [addfox.content] placeholder expansion.
 * Prefer compilation.entrypoints["content"].getFiles() so we get exactly the assets built from the content entry (including any CSS it imports). Fallback to naming-based collection if entrypoints are unavailable or return no CSS.
 */
function collectContentScriptOutput(
  compilation: CompilationLike,
  entries: EntryInfo[]
): ContentScriptOutputWithPolicy | undefined {
  const hasContent = entries.some((e) => e.name === "content");
  if (!hasContent) return undefined;

  const autoFillCssInManifest = !shouldDisableManifestCssAutoFill(entries);
  const fromEntrypoint = tryGetContentEntryFiles(compilation);
  const byNames = collectContentScriptOutputByNames(compilation);

  if (fromEntrypoint?.js.length) {
    const css = fromEntrypoint.css.length ? fromEntrypoint.css : (byNames?.css ?? []);
    return { js: fromEntrypoint.js, css, autoFillCssInManifest };
  }

  if (!byNames) return undefined;
  return { ...byNames, autoFillCssInManifest };
}

function tryGetContentEntryFiles(compilation: CompilationLike): ContentScriptOutput | undefined {
  const entrypoints = compilation.entrypoints;
  if (!entrypoints) return undefined;

  const contentEntry = getContentEntryFromEntrypoints(entrypoints);
  if (!contentEntry || typeof contentEntry.getFiles !== "function") return undefined;

  const files = safeGetFiles(contentEntry);
  if (!files?.length) return undefined;

  return categorizeFiles(files);
}

function getContentEntryFromEntrypoints(entrypoints: unknown): EntrypointLike | undefined {
  if (isMap(entrypoints)) {
    return entrypoints.get("content");
  }
  if (isRecord(entrypoints)) {
    return entrypoints["content"];
  }
  return undefined;
}

function isMap(value: unknown): value is EntrypointsMap {
  return typeof (value as EntrypointsMap).get === "function";
}

function isRecord(value: unknown): value is EntrypointsRecord {
  return typeof value === "object" && value !== null;
}

function safeGetFiles(entry: EntrypointLike): ReadonlyArray<string> | undefined {
  try {
    const files = entry.getFiles?.();
    return Array.isArray(files) && files.length ? files : undefined;
  } catch {
    return undefined;
  }
}

function categorizeFiles(files: ReadonlyArray<string>): ContentScriptOutput {
  const js: string[] = [];
  const css: string[] = [];

  for (const name of files) {
    if (typeof name !== "string") continue;
    const normalized = normalizePath(name);

    if (normalized.endsWith(".js")) js.push(normalized);
    else if (normalized.endsWith(".css")) css.push(normalized);
  }

  return { js: js.sort(), css: css.sort() };
}

function collectContentScriptOutputByNames(compilation: CompilationLike): ContentScriptOutput | undefined {
  const keys = getAssetKeys(compilation);
  if (!keys.length) return undefined;

  return {
    js: filterAndSortKeys(keys, CONTENT_JS_PATTERNS),
    css: filterAndSortKeys(keys, CONTENT_CSS_PATTERNS),
  };
}

function getAssetKeys(compilation: CompilationLike): string[] {
  if (compilation.assets) {
    return Object.keys(compilation.assets);
  }
  return safeGetAssetKeys(compilation.getAssets);
}

function safeGetAssetKeys(getAssets?: () => ReadonlyArray<AssetLike>): string[] {
  if (typeof getAssets !== "function") return [];

  try {
    const assets = getAssets();
    if (!Array.isArray(assets)) return [];

    return assets
      .map((a) => a?.filename ?? a?.name)
      .filter((s): s is string => typeof s === "string");
  } catch {
    return [];
  }
}

function filterAndSortKeys(keys: string[], patterns: ((k: string) => boolean)[]): string[] {
  return keys
    .filter((k) => {
      const normalized = normalizePath(k);
      if (!normalized.endsWith(".css") && !normalized.endsWith(".js")) return false;
      return patterns.some((pattern) => pattern(normalized));
    })
    .map(normalizePath)
    .sort();
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function shouldDisableManifestCssAutoFill(entries: EntryInfo[]): boolean {
  const contentEntry = entries.find((e) => e.name === "content");
  if (!contentEntry) return false;
  return hasShadowOrIframeContentUIUsage(contentEntry.scriptPath);
}

function hasShadowOrIframeContentUIUsage(scriptPath: string): boolean {
  const source = safeReadFile(scriptPath);
  if (!source) return false;

  return CONTENT_CSS_PATTERN.test(source) || CONTENT_WRAPPER_PATTERN.test(source);
}

function safeReadFile(filePath: string): string | undefined {
  if (!existsSync(filePath)) return undefined;
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return undefined;
  }
}

function applyContentCssManifestPolicy(
  outputManifest: ManifestRecord,
  inputManifest: AddfoxResolvedConfig["manifest"],
  browser: BrowserTarget,
  contentScriptOutput?: ContentScriptOutputWithPolicy
): ManifestRecord {
  const shouldRemoveCss =
    contentScriptOutput?.autoFillCssInManifest === false &&
    !hasUserDefinedContentCss(inputManifest, browser);

  return shouldRemoveCss ? removeContentScriptCss(outputManifest) : outputManifest;
}

function hasUserDefinedContentCss(
  manifest: AddfoxResolvedConfig["manifest"],
  browser: BrowserTarget
): boolean {
  const branch = pickManifestBranch(manifest, browser);
  if (!branch) return false;

  const scripts = branch.content_scripts;
  if (!Array.isArray(scripts)) return false;

  return scripts.some(hasCssField);
}

function hasCssField(item: unknown): boolean {
  if (!isPlainObject(item)) return false;
  const css = item.css;
  return Array.isArray(css) && css.length > 0;
}

function pickManifestBranch(
  manifest: AddfoxResolvedConfig["manifest"],
  browser: BrowserTarget
): ManifestRecord | null {
  if (!isPlainObject(manifest)) return null;
  if (!("chromium" in manifest) && !("firefox" in manifest)) {
    return manifest as ManifestRecord;
  }

  const byBrowser = manifest as { chromium?: unknown; firefox?: unknown };
  const primary = browser === "firefox" ? byBrowser.firefox : byBrowser.chromium;
  const fallback = browser === "firefox" ? byBrowser.chromium : byBrowser.firefox;

  return asManifestRecord(primary) ?? asManifestRecord(fallback);
}

function asManifestRecord(value: unknown): ManifestRecord | null {
  return isPlainObject(value) ? (value as ManifestRecord) : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function removeContentScriptCss(manifest: ManifestRecord): ManifestRecord {
  const scripts = manifest.content_scripts;
  if (!Array.isArray(scripts)) return manifest;

  const next = scripts.map((item) => {
    if (!isPlainObject(item)) return item;
    const { css: _, ...rest } = item;
    return rest;
  });

  return { ...manifest, content_scripts: next };
}

function injectContentCssRuntimeMeta(
  distPath: string,
  contentScriptOutput?: ContentScriptOutputWithPolicy
): void {
  if (!contentScriptOutput?.css.length || !contentScriptOutput.js.length) return;

  const normalizedCss = contentScriptOutput.css.map(normalizePath);
  const cssTexts = normalizedCss.map((file) => readCssAssetText(distPath, file));
  const banner = buildCssBanner(normalizedCss, cssTexts);

  for (const jsRel of contentScriptOutput.js) {
    prependBannerToJsFile(distPath, jsRel, banner);
  }
}

function buildCssBanner(cssFiles: string[], cssTexts: string[]): string {
  return (
    `;globalThis.${CONTENT_CSS_GLOBAL_KEY}=${JSON.stringify(cssFiles)};` +
    `globalThis.${CONTENT_CSS_TEXTS_GLOBAL_KEY}=${JSON.stringify(cssTexts)};\n`
  );
}

function prependBannerToJsFile(distPath: string, jsRel: string, banner: string): void {
  const absPath = resolve(distPath, jsRel);
  if (!existsSync(absPath)) return;

  const src = readFileSync(absPath, "utf-8");
  if (hasCssMetaInjected(src)) return;

  writeFileSync(absPath, banner + src, "utf-8");
}

function hasCssMetaInjected(source: string): boolean {
  return (
    source.includes(`globalThis.${CONTENT_CSS_GLOBAL_KEY}`) &&
    source.includes(`globalThis.${CONTENT_CSS_TEXTS_GLOBAL_KEY}`)
  );
}

function readCssAssetText(distPath: string, file: string): string {
  const absPath = resolve(distPath, file);
  return safeReadFile(absPath) ?? "";
}

function validateEntryHtmlRules(entries: EntryInfo[], manifest: ManifestRecord): void {
  const mv = getManifestVersion(manifest);
  const errors = entries.flatMap((entry) => validateEntryHtml(entry, mv));

  if (errors.length) {
    throw new Error(errors.join("; "));
  }
}

function validateEntryHtml(entry: EntryInfo, mv: 2 | 3 | null): string[] {
  const errors: string[] = [];
  const htmlFlag = getEntryHtmlFlag(entry);

  if (REQUIRED_HTML_ENTRIES.has(entry.name) && htmlFlag === false) {
    errors.push(`entry "${entry.name}" must generate HTML; html:false is not allowed`);
  }
  if (mv === 3 && entry.name === "background" && htmlFlag === true) {
    errors.push(`entry "background" cannot generate HTML in MV3`);
  }

  return errors;
}

function getManifestVersion(manifest: ManifestRecord): 2 | 3 | null {
  const mv = manifest.manifest_version;
  return mv === 2 || mv === 3 ? mv : null;
}

function getEntryHtmlFlag(entry: EntryInfo): boolean | undefined {
  return (entry as EntryInfo & { html?: boolean }).html;
}

async function writeMetaMarkdown(
  metaDir: string,
  manifest: ManifestRecord,
  entries: EntryInfo[],
  entrypointsMap?: EntrypointsMapData
): Promise<void> {
  if (!ensureMetaDir(metaDir)) return;

  const content = buildMetaMarkdown(manifest, entries, entrypointsMap);
  const metaPath = resolve(metaDir, "meta.md");
  await writeFileAsync(metaPath, content, "utf-8");
}

function ensureMetaDir(metaDir: string): boolean {
  try {
    if (!existsSync(metaDir)) mkdirSync(metaDir, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

function buildMetaMarkdown(
  manifest: ManifestRecord,
  entries: EntryInfo[],
  entrypointsMap?: EntrypointsMapData
): string {
  const sections = [
    formatAiPromptHeader(),
    formatBasicSection(manifest),
    formatPermissionsSection(manifest),
    formatEntriesSection(entries, entrypointsMap),
  ];

  return sections.join("\n\n") + "\n";
}

function formatAiPromptHeader(): string {
  return [
    "---",
    "ai_context: addfox_extension_metadata",
    "description: Structured metadata about the Addfox browser extension project",
    "when_to_use:",
    "  - Initial project exploration - understand extension structure, entries, permissions",
    "  - Build debugging - check entry configuration, output paths, dependencies",
    "  - Architecture review - analyze entry relationships and code organization",
    "  - Before modifying entries - see current configuration and generated outputs",
    "structure:",
    "  - Section 1: Basic project info (name, version, manifest version)",
    "  - Section 2: Permissions (required, host, optional)",
    "  - Section 3: Entries (source files, build outputs, configuration flags)",
    "related_files:",
    "  - error.md: Runtime errors (use when debugging extension errors)",
    "  - llms.txt: This project's AI guide (always read first)",
    "---",
  ].join("\n");
}

async function writeLlmsTxt(
  metaDir: string,
  manifest: ManifestRecord,
  entries: EntryInfo[]
): Promise<void> {
  if (!ensureMetaDir(metaDir)) return;

  const content = buildLlmsTxt(manifest, entries);
  const llmsPath = resolve(metaDir, "llms.txt");
  await writeFileAsync(llmsPath, content, "utf-8");
}

function buildLlmsTxt(manifest: ManifestRecord, entries: EntryInfo[]): string {
  const name = getString(manifest.name) ?? "Unknown";
  const description = getString(manifest.description) ?? "Browser extension";
  const version = getString(manifest.version) ?? "Unknown";
  const mv = getManifestVersion(manifest);

  const entryList = entries.map((e) => `- **${e.name}**: ${e.scriptPath}`).join("\n");

  return [
    "# AI Guide for Addfox Extension Project",
    "",
    "> This file guides AI assistants working on this browser extension project.",
    "> Generated by Addfox framework. Do not edit manually.",
    "",
    "## Project Overview",
    "",
    `- **Name**: ${name}`,
    `- **Description**: ${description}`,
    `- **Version**: ${version}`,
    `- **Manifest Version**: ${mv ?? "Unknown"}`,
    `- **Framework**: Addfox (browser extension framework)`,
    "",
    "## Entry Points",
    "",
    entryList || "- No entries configured",
    "",
    "## AI Context Files in .addfox/",
    "",
    "This project generates three AI-friendly files in the \`.addfox/\` directory:",
    "",
    "### 1. llms.txt (this file)",
    "**Purpose**: High-level project guide for AI assistants.",
    "",
    "**When to read**:",
    "- First interaction with the project",
    "- Understanding project structure and conventions",
    "- Looking for guidance on which file to use next",
    "",
    "**Contains**: Project overview, entry list, and file usage guide.",
    "",
    "### 2. meta.md",
    "**Purpose**: Detailed project metadata and build information.",
    "",
    "**When to use**:",
    "- ⭐ **AL**: Understanding extension structure, entries, and configuration",
    "- ⭐ **Analyzing entry points**: Source files, build outputs, dependencies",
    "- ⭐ **Build debugging**: Entry configuration, output paths, build issues",
    "- ⭐ **Architecture review**: Entry relationships and code organization",
    "- ⭐ **Before modifying entries**: Current configuration and generated outputs",
    "",
    "**Contains**:",
    "- Basic info: name, version, manifest version",
    "- Permissions: required, host, and optional permissions",
    "- Entries: file tree showing source → build output mapping",
    "",
    "### 3. error.md",
    "**Purpose**: Runtime error information from the extension.",
    "",
    "**When to use**:",
    "- ⭐ **ALWAYS**: When user reports extension runtime errors",
    "- ⭐ **Debugging**: Extension crashes, console errors, unexpected behavior",
    "- ⭐ **Entry-specific issues**: Errors occurring in specific entry contexts",
    "- ⭐ **Build vs runtime**: Errors that appear after successful build",
    "",
    "**Contains**:",
    "- Error type and message",
    "- Entry context where error occurred",
    "- Stack trace",
    "- Location (file, line, column)",
    "- Timestamp",
    "",
    "**Note**: This file is cleared on each dev server start. It only contains the most recent error.",
    "",
    "## Quick Decision Guide",
    "",
    "| Scenario | File to Use | Why |",
    "|----------|-------------|-----|",
    "| First time seeing project | llms.txt | Get oriented |",
    "| Understanding structure | meta.md | Detailed metadata |",
    "| Build issues | meta.md | Entry configurations |",
    "| Runtime errors | error.md | Stack traces and context |",
    "| Permission issues | meta.md | Permission lists |",
    "| Entry relationships | meta.md | File trees |",
    "",
    "## Addfox Framework Conventions",
    "",
    "### Entry Names",
    "Standard browser extension entries:",
    "- \`popup\`: Popup UI (usually has HTML)",
    "- \`options\`: Options/settings page (usually has HTML)",
    "- \`background\`: Service worker / background script (no HTML in MV3)",
    "- \`content\`: Content script injected into web pages",
    "- \`sidepanel\`: Side panel UI (Chrome)",
    "- \`devtools\`: DevTools panel",
    "- \`offscreen\`: Offscreen document (for DOM APIs in MV3)",
    "",
    "### Entry Configuration",
    "Entries can have these flags:",
    "- \`html: true\`: Generates HTML page (for popup/options)",
    "- \`html: false\`: No HTML generation (for background/content)",
    "- \`outputFollowsScriptPath\`: Output follows source script location",
    "- \`scriptInject: 'head' | 'body'\`: Where to inject script in HTML",
    "",
    "---",
    "",
    "*Generated by Addfox. Last updated: " + new Date().toISOString() + "*",
    "",
  ].join("\n");
}

function formatBasicSection(manifest: ManifestRecord): string {
  const name = getString(manifest.name);
  const description = getString(manifest.description);
  const version = getString(manifest.version);
  const frameworkVersion = getString(getAddfoxVersion());
  const manifestVersion = getManifestVersion(manifest);

  return [
    "# Extension Meta",
    "",
    "## 1. Basic information",
    "",
    "- Framework: addfox",
    `- Name: ${name ?? "Unknown"}`,
    `- Description: ${description ?? "None"}`,
    `- Version: ${version ?? "Unknown"}`,
    `- Framework version: ${frameworkVersion ?? "Unknown"}`,
    `- Manifest version: ${manifestVersion ?? "Unknown"}`,
  ].join("\n");
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function formatPermissionsSection(manifest: ManifestRecord): string {
  const permissions = pickArray(manifest.permissions);
  const hostPermissions = pickArray(manifest.host_permissions);
  const optionalPermissions = pickArray(manifest.optional_permissions);

  return [
    "## 2. Permissions",
    "",
    "### 2.1 Permissions",
    formatList(permissions),
    "",
    "### 2.2 Host permissions",
    formatList(hostPermissions),
    "",
    "### 2.3 Optional permissions",
    formatList(optionalPermissions),
  ].join("\n");
}

function formatList(items: string[]): string {
  return items.length ? items.map((p) => `- ${p}`).join("\n") : "- None";
}

function formatEntriesSection(entries: EntryInfo[], entrypointsMap?: EntrypointsMapData): string {
  const lines = ["## 3. Entries", ""];

  if (!entries.length) {
    lines.push("- None");
    return lines.join("\n");
  }

  // Build tree content for all entries
  const treeLines: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const mapping = entrypointsMap?.get(entry.name);
    const entryTree = formatEntryTree(entry, mapping);
    treeLines.push(entryTree);
    // Add blank line between entries (except after last)
    if (i < entries.length - 1) {
      treeLines.push("");
    }
  }

  // Wrap in text code block for tree visualization
  lines.push("```text");
  lines.push(...treeLines);
  lines.push("```");

  return lines.join("\n");
}

function formatEntryTree(entry: EntryInfo, mapping?: EntryFilesMapping): string {
  const lines: string[] = [];
  const name = entry.name;

  // Entry header
  lines.push(`${name}/`);

  // Source file
  const sourcePath = mapping?.source ?? entry.scriptPath ?? "unknown";
  lines.push(`├── 📄 Source: ${normalizePath(sourcePath)}`);

  // HTML file if exists
  if (entry.htmlPath) {
    lines.push(`├── 📄 HTML: ${normalizePath(entry.htmlPath)}`);
  }

  // Output files from compilation
  const outputs = mapping?.outputs ?? [];
  if (outputs.length > 0) {
    // Group outputs by type
    const jsFiles = outputs.filter((f) => f.endsWith(".js"));
    const cssFiles = outputs.filter((f) => f.endsWith(".css"));
    const htmlFiles = outputs.filter((f) => f.endsWith(".html"));
    const otherFiles = outputs.filter((f) => !f.endsWith(".js") && !f.endsWith(".css") && !f.endsWith(".html"));

    const allGroups = [
      { label: "JS", files: jsFiles },
      { label: "CSS", files: cssFiles },
      { label: "HTML", files: htmlFiles },
      { label: "Other", files: otherFiles },
    ].filter((g) => g.files.length > 0);

    for (let i = 0; i < allGroups.length; i++) {
      const group = allGroups[i];
      const isLastGroup = i === allGroups.length - 1;
      const groupPrefix = isLastGroup ? "└──" : "├──";

      lines.push(`${groupPrefix} 📁 ${group.label}/`);

      for (let j = 0; j < group.files.length; j++) {
        const file = group.files[j];
        const isLastFile = j === group.files.length - 1;
        const filePrefix = isLastGroup ? (isLastFile ? "    └──" : "    ├──") : (isLastFile ? "│   └──" : "│   ├──");
        lines.push(`${filePrefix} ${file}`);
      }
    }
  } else {
    lines.push("└── 📁 Output: (not yet built)");
  }

  // Configuration flags
  const configs: string[] = [];
  if (entry.html === true) configs.push("html: true");
  if (entry.html === false) configs.push("html: false");
  if (entry.outputFollowsScriptPath) configs.push("outputFollowsScriptPath: true");
  if (entry.scriptInject) configs.push(`scriptInject: ${entry.scriptInject}`);

  if (configs.length > 0) {
    lines.push(`    ⚙️  ${configs.join(", ")}`);
  }

  return lines.join("\n");
}

function pickArray(field: unknown): string[] {
  if (!Array.isArray(field)) return [];
  return field.filter((item): item is string => typeof item === "string");
}

/** Entry files mapping from compilation entrypoints */
interface EntryFilesMapping {
  /** Source entry file path */
  source: string;
  /** Output files generated for this entry (JS, CSS, HTML) */
  outputs: string[];
}

type EntrypointsMapData = Map<string, EntryFilesMapping>;

/**
 * Extract entrypoints mapping from compilation for AI context.
 * Maps each entry name to its source file and generated output files.
 */
function extractEntrypointsMap(compilation: CompilationLike, entries: EntryInfo[]): EntrypointsMapData {
  const map = new Map<string, EntryFilesMapping>();
  const entrypoints = compilation.entrypoints;

  for (const entry of entries) {
    const entryOutput: EntryFilesMapping = {
      source: entry.scriptPath,
      outputs: [],
    };

    // Try to get files from compilation entrypoints
    if (entrypoints) {
      const ep = getEntrypointFromMap(entrypoints, entry.name);
      if (ep && typeof ep.getFiles === "function") {
        try {
          const files = ep.getFiles();
          if (Array.isArray(files)) {
            entryOutput.outputs = files.map(normalizePath).sort();
          }
        } catch {
          // Fallback to empty outputs if getFiles fails
        }
      }
    }

    // If no outputs from entrypoints, try to infer from assets
    if (entryOutput.outputs.length === 0 && compilation.assets) {
      const inferredOutputs = inferEntryOutputsFromAssets(entry, compilation.assets);
      entryOutput.outputs = inferredOutputs;
    }

    map.set(entry.name, entryOutput);
  }

  return map;
}

function getEntrypointFromMap(entrypoints: unknown, name: string): EntrypointLike | undefined {
  if (isMap(entrypoints)) {
    return entrypoints.get(name);
  }
  if (isRecord(entrypoints)) {
    return entrypoints[name];
  }
  return undefined;
}

function inferEntryOutputsFromAssets(entry: EntryInfo, assets: Record<string, unknown>): string[] {
  const outputs: string[] = [];
  const assetNames = Object.keys(assets);

  // Match JS files
  const jsPatterns = [
    `${entry.name}.js`,
    `${entry.name}/index.js`,
    `static/js/${entry.name}.*.js`,
    `${entry.name}.*.js`,
  ];

  // Match CSS files
  const cssPatterns = [
    `${entry.name}.css`,
    `${entry.name}/index.css`,
    `static/css/${entry.name}.*.css`,
    `${entry.name}.*.css`,
  ];

  // Match HTML files
  const htmlPatterns = [
    `${entry.name}.html`,
    `${entry.name}/index.html`,
    `${entry.name}/*.html`,
  ];

  const patterns = [...jsPatterns, ...cssPatterns, ...htmlPatterns];

  for (const asset of assetNames) {
    const normalizedAsset = normalizePath(asset);
    for (const pattern of patterns) {
      if (matchPattern(normalizedAsset, pattern)) {
        outputs.push(normalizedAsset);
        break;
      }
    }
  }

  return outputs.sort();
}

function matchPattern(filename: string, pattern: string): boolean {
  // Convert simple glob pattern to regex
  const regexPattern = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/{{GLOBSTAR}}/g, ".*");
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filename);
}
