import { resolve, basename, extname, dirname, relative } from "path";
import { existsSync } from "fs";
import type { RsbuildConfig, RsbuildPluginAPI } from "@rsbuild/core";
import type { AddfoxResolvedConfig, EntryInfo, ScriptInjectPosition, BrowserTarget } from "@addfox/core";
import { parseAddfoxEntryFromHtml } from "@addfox/core";

/** hotReload: undefined = not set, object = enabled, false = explicitly disabled. Only when false do we disable Rspack HMR. */
type HotReloadConfig = AddfoxResolvedConfig["hotReload"];

function isHotReloadDisabled(value: HotReloadConfig): boolean {
  return value === false;
}

const NO_HTML_ENTRIES = new Set(["background", "content"]);

/** Same rule as {@link needsHtmlGeneration} — kept near path builders that depend on it. */
function entryBuildsHtmlPage(entry: EntryInfo): boolean {
  if (NO_HTML_ENTRIES.has(entry.name)) return false;
  return entry.html === true || entry.htmlPath != null;
}

/** Chunk name for shared vendor (react, react-dom, webextension-polyfill) to avoid duplicate in popup/options. */
export const SHARED_VENDOR_CHUNK_NAME = "shared-vendor";

/** Matches node_modules used by HTML entries for a single shared chunk (WXT-style). */
const SHARED_VENDOR_TEST = /[\\/]node_modules[\\/]/;

const toWebPath = (p: string): string => p.replace(/\\/g, "/");

interface ChunkFilenamePathData {
  chunk?: { name?: string; id?: string };
}

type ChunkFilenameFn = (pathData: ChunkFilenamePathData) => string;

interface EntryOutputMap {
  html: Record<string, string>;
  js: Record<string, string>;
  css: Record<string, string>;
}

interface PerformanceConfig {
  chunkSplit?: Record<string, unknown>;
}

interface WatchFilesOption {
  paths?: string | string[];
  options?: unknown;
}

interface DevConfig {
  watchFiles?: WatchFilesOption;
}

interface SourceConfig {
  entry?: Record<string, unknown>;
}

interface HtmlConfig {
  template?: unknown;
  inject?: unknown;
  outputStructure?: string;
}

interface ToolsConfig {
  htmlPlugin?: unknown;
}

interface OutputConfig {
  distPath?: Record<string, unknown>;
  cleanDistPath?: boolean;
  assetPrefix?: string;
  copy?: unknown;
}

interface TemplateContext {
  value: string;
  entryName: string;
}

interface HtmlPluginContext {
  entryName: string;
  entryValue: unknown;
}

interface Compilation {
  fileDependencies: { add: (p: string) => void };
}

interface Compiler {
  hooks: {
    compilation: {
      tap: (name: string, fn: (compilation: Compilation) => void) => void;
    };
  };
}

/** Check if a plugin is HMR plugin. */
function isHmrPlugin(p: unknown): boolean {
  if (!p || typeof p !== "object") return false;
  const obj = p as { constructor?: { name?: string }; name?: string };
  return (
    obj.constructor?.name === "HotModuleReplacementPlugin" ||
    obj.name === "HotModuleReplacementPlugin"
  );
}

/** Disable Rspack HMR so dist is not filled with *.hot-update.js (extension build watch). */
function disableRspackHmrInPlace(config: Record<string, unknown>): void {
  const devServer = config.devServer as Record<string, unknown> | undefined;
  if (devServer) {
    devServer.hot = false;
  } else {
    config.devServer = { hot: false };
  }

  const plugins = config.plugins;
  if (Array.isArray(plugins)) {
    config.plugins = plugins.filter((p: unknown) => !isHmrPlugin(p));
  }
}

/** For entries with scriptInject: read htmlPath, strip data-addfox-entry script, return content to use as template. */
function getStrippedTemplateContent(htmlPath: string): string | undefined {
  const parsed = parseAddfoxEntryFromHtml(htmlPath);
  return parsed?.strippedHtml;
}

/** Build output paths for an entry that follows script path. */
function buildScriptFollowingPaths(
  entry: EntryInfo,
  appDir: string
): { js: string; css: string; html?: string } {
  const relScript = toWebPath(relative(appDir, entry.scriptPath));
  const scriptExt = extname(entry.scriptPath);
  const scriptBase = scriptExt ? relScript.slice(0, -scriptExt.length) : relScript;

  return {
    js: `${scriptBase}.js`,
    css: `${scriptBase}.css`,
    html: entry.htmlPath ? toWebPath(relative(appDir, entry.htmlPath)) : undefined,
  };
}

/** Build output paths for a standard entry. */
function buildStandardPaths(entry: EntryInfo): { js: string; css: string; html?: string } {
  const scriptStem = basename(entry.scriptPath, extname(entry.scriptPath));
  const isSingleScript = scriptStem === entry.name;

  const jsPath = isSingleScript ? `${entry.name}.js` : `${entry.name}/index.js`;
  const cssPath = isSingleScript ? `${entry.name}.css` : `${entry.name}/index.css`;

  let htmlPath: string | undefined;
  if (entry.htmlPath) {
    const htmlFile = basename(entry.htmlPath).toLowerCase();
    const entryDir = basename(dirname(entry.htmlPath)).toLowerCase();
    const isEntryDir = entryDir === entry.name.toLowerCase();
    const isSingleHtml = htmlFile === `${entry.name}.html`;

    htmlPath = isEntryDir
      ? `${entry.name}/${htmlFile}`
      : isSingleHtml
        ? `${entry.name}.html`
        : `${entry.name}/${htmlFile}`;
  } else if (entryBuildsHtmlPage(entry)) {
    // e.g. Vue/React: app/popup/index.ts only — manifest uses popup/index.html (@addfox/core) but
    // Rsbuild defaults to popup.html at dist root if filename is unset.
    htmlPath = `${entry.name}/index.html`;
  }

  return { js: jsPath, css: cssPath, html: htmlPath };
}

/** Build output path mappings for all entries. */
function buildEntryOutputMap(entries: EntryInfo[], appDir: string): EntryOutputMap {
  const html: Record<string, string> = {};
  const js: Record<string, string> = {};
  const css: Record<string, string> = {};

  for (const entry of entries) {
    const paths = entry.outputFollowsScriptPath
      ? buildScriptFollowingPaths(entry, appDir)
      : buildStandardPaths(entry);

    js[entry.name] = paths.js;
    css[entry.name] = paths.css;
    if (paths.html) {
      html[entry.name] = paths.html;
    }
  }

  return { html, js, css };
}

/** Build JS chunk filename function for output. */
export function buildJsChunkFilenameFn(
  outputMap: Pick<EntryOutputMap, "js">,
  entryNames: Set<string>
): ChunkFilenameFn {
  return (pathData) => {
    const name = pathData.chunk?.name ?? pathData.chunk?.id ?? "chunk";
    const nameStr = String(name);

    if (nameStr === SHARED_VENDOR_CHUNK_NAME) {
      return "static/js/shared-vendor.js";
    }
    if (entryNames.has(nameStr)) {
      return outputMap.js[nameStr] ?? `${nameStr}/index.js`;
    }
    return `static/js/${nameStr}.js`;
  };
}

/** Build CSS chunk filename function for output. */
export function buildCssChunkFilenameFn(
  outputMap: Pick<EntryOutputMap, "css">,
  entryNames: Set<string>
): ChunkFilenameFn {
  return (pathData) => {
    const name = pathData.chunk?.name ?? pathData.chunk?.id ?? "chunk";
    const nameStr = String(name);

    if (entryNames.has(nameStr)) {
      return outputMap.css[nameStr] ?? `${nameStr}/index.css`;
    }
    return `static/css/${nameStr}.css`;
  };
}

/** Create a map of entry names to their HTML template paths. */
function createTemplateMap(entries: EntryInfo[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.htmlPath) {
      map[entry.name] = entry.htmlPath;
    }
  }
  return map;
}

/** Create a map of entry names to their script inject positions. */
function createScriptInjectMap(entries: EntryInfo[]): Record<string, ScriptInjectPosition> {
  const map: Record<string, ScriptInjectPosition> = {};
  for (const entry of entries) {
    if (entry.scriptInject) {
      map[entry.name] = entry.scriptInject;
    }
  }
  return map;
}

/** Determine if an entry needs HTML generation. */
function needsHtmlGeneration(entry: EntryInfo): boolean {
  return entryBuildsHtmlPage(entry);
}

/** Build the source entry configuration. */
function buildSourceEntry(entries: EntryInfo[]): Record<string, string | { import: string; html?: boolean }> {
  const entry: Record<string, string | { import: string; html?: boolean }> = {};

  for (const e of entries) {
    entry[e.name] = needsHtmlGeneration(e)
      ? e.scriptPath
      : { import: e.scriptPath, html: false };
  }

  return entry;
}

function ensurePerformanceConfig(config: RsbuildConfig): PerformanceConfig {
  const cfg = config as RsbuildConfig & { performance?: PerformanceConfig };
  if (!cfg.performance) {
    cfg.performance = {};
  }
  const perf = cfg.performance;
  if (!perf.chunkSplit) {
    perf.chunkSplit = {};
  }
  return perf;
}

/** Setup chunk split configuration for shared vendor. */
function setupChunkSplit(config: RsbuildConfig): void {
  const performance = ensurePerformanceConfig(config);
  const chunkSplit = performance.chunkSplit as Record<string, unknown>;
  const prevOverride = chunkSplit.override as Record<string, unknown> | undefined;

  chunkSplit.override = {
    ...prevOverride,
    chunks: "all",
    cacheGroups: {
      ...(prevOverride?.cacheGroups as Record<string, unknown> | undefined),
      [SHARED_VENDOR_CHUNK_NAME]: {
        test: SHARED_VENDOR_TEST,
        name: SHARED_VENDOR_CHUNK_NAME,
        priority: 30,
        enforce: true,
        reuseExistingChunk: true,
      },
    },
  };
}

function ensureDevConfig(config: RsbuildConfig): DevConfig {
  const cfg = config as RsbuildConfig & { dev?: DevConfig };
  if (!cfg.dev) {
    cfg.dev = {};
  }
  return cfg.dev;
}

/** Setup watch files for HTML templates. */
function setupWatchFiles(config: RsbuildConfig, htmlPaths: string[]): void {
  if (htmlPaths.length === 0) return;

  const dev = ensureDevConfig(config);
  const prevWatch = dev.watchFiles;
  const existingPaths = Array.isArray(prevWatch?.paths)
    ? prevWatch.paths
    : typeof prevWatch?.paths === "string"
      ? [prevWatch.paths]
      : [];

  dev.watchFiles = {
    ...(prevWatch && typeof prevWatch === "object" ? prevWatch : {}),
    paths: [...existingPaths, ...htmlPaths],
  };
}

function ensureOutputConfig(config: RsbuildConfig): OutputConfig {
  const cfg = config as RsbuildConfig & { output?: OutputConfig };
  if (!cfg.output) {
    cfg.output = {};
  }
  return cfg.output;
}

/** Setup output configuration including dist path and copy rules. */
function setupOutputConfig(
  config: RsbuildConfig,
  resolvedConfig: AddfoxResolvedConfig,
  publicDir: string,
  distPath: string
): void {

  const output = ensureOutputConfig(config);

  // Use provided distPath (browser-specific, e.g., .addfox/extension/extension-chromium)
  const existingDistPath = output.distPath && typeof output.distPath === "object"
    ? output.distPath
    : {};
  output.distPath = { ...existingDistPath, root: distPath };

  output.cleanDistPath = output.cleanDistPath ?? true;
  output.assetPrefix = output.assetPrefix ?? "/";

  // Add public dir copy rule if it exists
  if (existsSync(publicDir)) {
    const copyRules = Array.isArray(output.copy) ? output.copy : [];
    output.copy = [...copyRules, { from: publicDir }];
  }

  setupChunkSplit(config);
}

/** Create the HTML template handler function. */
function createTemplateHandler(
  templateMap: Record<string, string>,
  prevTemplate: unknown
): (ctx: TemplateContext) => string | void {
  return (ctx: TemplateContext): string | void => {
    if (templateMap[ctx.entryName]) {
      return templateMap[ctx.entryName];
    }
    if (typeof prevTemplate === "function") {
      return prevTemplate(ctx);
    }
    return undefined;
  };
}

/** Create the HTML inject position handler. */
function createInjectHandler(
  scriptInjectMap: Record<string, ScriptInjectPosition>
): ScriptInjectPosition | ((ctx: { entryName: string }) => ScriptInjectPosition) {
  const hasInjectMap = Object.keys(scriptInjectMap).length > 0;

  return hasInjectMap
    ? ({ entryName }: { entryName: string }) => scriptInjectMap[entryName] ?? "head"
    : "head";
}

/** Create the HTML plugin configuration handler. */
function createHtmlPluginHandler(
  outputMap: EntryOutputMap,
  entryByName: Map<string, EntryInfo>,
  prevHtmlPlugin: unknown
): (htmlConfig: Record<string, unknown>, ctx: HtmlPluginContext) => void {
  return (htmlConfig: Record<string, unknown>, ctx: HtmlPluginContext): void => {
    // Call previous handler if exists
    if (prevHtmlPlugin && typeof prevHtmlPlugin === "function") {
      prevHtmlPlugin(htmlConfig, ctx);
    }

    // Set output filename
    if (outputMap.html[ctx.entryName]) {
      htmlConfig.filename = outputMap.html[ctx.entryName];
    }

    // Apply stripped template content for scriptInject entries
    const entry = entryByName.get(ctx.entryName);
    if (entry?.scriptInject && entry.htmlPath && existsSync(entry.htmlPath)) {
      const content = getStrippedTemplateContent(entry.htmlPath);
      if (content) {
        htmlConfig.templateContent = content;
      }
    }
  };
}

/** Create rspack plugin for watching HTML template files. */
function createWatchTemplatesPlugin(htmlPaths: string[]): {
  name: string;
  apply: (compiler: Compiler) => void;
} {
  return {
    name: "rsbuild-plugin-extension-entry:watch-templates",
    apply(compiler: Compiler): void {
      compiler.hooks.compilation.tap("rsbuild-plugin-extension-entry:watch-templates", (compilation) => {
        for (const p of htmlPaths) {
          if (existsSync(p)) {
            compilation.fileDependencies.add(p);
          }
        }
      });
    },
  };
}

interface WatchOptionsLike {
  ignored?: string | RegExp | Array<string | RegExp>;
}

/** Setup rspack configuration before compiler creation. */
function setupRspackConfig(
  bundlerConfig: Record<string, unknown>,
  context: {
    root: string;
    outputRoot: string;
    outDir: string;
    htmlPaths: string[];
    outputMap: EntryOutputMap;
    entryNames: Set<string>;
    /** When true, Rspack HMR is disabled (only when addfox hotReload config is off). */
    hotReloadDisabled: boolean;
  }
): void {
  const { root, outputRoot, outDir, htmlPaths, outputMap, entryNames, hotReloadDisabled } = context;
  const distPath = resolve(root, outputRoot, outDir);

  if (hotReloadDisabled) {
    disableRspackHmrInPlace(bundlerConfig);
  }

  // Add watch templates plugin
  if (htmlPaths.length > 0) {
    const rspackConfig = bundlerConfig as { plugins?: unknown[] };
    rspackConfig.plugins = rspackConfig.plugins ?? [];
    rspackConfig.plugins.push(createWatchTemplatesPlugin(htmlPaths));
  }

  // Setup watch options to ignore dist path
  const watchOpts = (bundlerConfig.watchOptions as WatchOptionsLike | undefined) ?? {};
  const existingIgnored = watchOpts.ignored;
  const ignoredList: (string | RegExp)[] = Array.isArray(existingIgnored)
    ? [...existingIgnored, distPath]
    : existingIgnored != null
      ? [existingIgnored, distPath]
      : [distPath];
  bundlerConfig.watchOptions = { ...watchOpts, ignored: ignoredList as string[] };

  // Setup output configuration
  if (bundlerConfig.output) {
    const output = bundlerConfig.output as Record<string, unknown>;
    output.path = distPath;

    const jsChunkName = buildJsChunkFilenameFn(outputMap, entryNames);
    const cssChunkName = buildCssChunkFilenameFn(outputMap, entryNames);

    output.filename = jsChunkName as unknown as string;
    output.chunkFilename = output.chunkFilename ?? jsChunkName;
    output.cssFilename = cssChunkName as unknown as string;
    output.cssChunkFilename = output.cssChunkFilename ?? cssChunkName;
    output.publicPath = "/";
  }

  // Setup optimization
  if (bundlerConfig.optimization) {
    const optimization = bundlerConfig.optimization as Record<string, unknown>;
    optimization.runtimeChunk = false;
    optimization.splitChunks = optimization.splitChunks ?? {};

    const split = optimization.splitChunks as Record<string, unknown>;
    // Only HTML entries participate in splitting so background/content vendor stays in their chunks
    split.chunks = typeof split.chunks === "function"
      ? split.chunks
      : (chunk: { name?: string }) => (chunk.name ? !NO_HTML_ENTRIES.has(chunk.name) : true);
  }
}

function ensureSourceConfig(config: RsbuildConfig): SourceConfig {
  const cfg = config as RsbuildConfig & { source?: SourceConfig };
  if (!cfg.source) {
    cfg.source = {};
  }
  return cfg.source;
}

function ensureHtmlConfig(config: RsbuildConfig): HtmlConfig {
  const cfg = config as RsbuildConfig & { html?: HtmlConfig };
  if (!cfg.html) {
    cfg.html = {};
  }
  return cfg.html;
}

function ensureToolsConfig(config: RsbuildConfig): ToolsConfig {
  const cfg = config as RsbuildConfig & { tools?: ToolsConfig };
  if (!cfg.tools) {
    cfg.tools = {};
  }
  return cfg.tools;
}

/** Modify Rsbuild configuration for extension entries. */
function modifyRsbuildConfig(
  config: RsbuildConfig,
  context: {
    entry: Record<string, string | { import: string; html?: boolean }>;
    templateMap: Record<string, string>;
    scriptInjectMap: Record<string, ScriptInjectPosition>;
    outputMap: EntryOutputMap;
    entryByName: Map<string, EntryInfo>;
    htmlPaths: string[];
    resolvedConfig: AddfoxResolvedConfig;
    publicDir: string;
    distPath: string;
  }
): void {
  const { entry, templateMap, scriptInjectMap, outputMap, entryByName, htmlPaths, resolvedConfig, publicDir, distPath } = context;

  // Setup source entry
  const source = ensureSourceConfig(config);
  source.entry = { ...(source.entry ?? {}), ...entry };

  // Setup HTML
  const html = ensureHtmlConfig(config);
  const prevTemplate = html.template;
  html.template = createTemplateHandler(templateMap, prevTemplate);
  html.inject = createInjectHandler(scriptInjectMap);
  html.outputStructure = html.outputStructure ?? "nested";

  // Setup HTML plugin
  const tools = ensureToolsConfig(config);
  const prevHtmlPlugin = tools.htmlPlugin;
  tools.htmlPlugin = createHtmlPluginHandler(outputMap, entryByName, prevHtmlPlugin);

  // Watch HTML templates
  setupWatchFiles(config, htmlPaths);

  // Setup output (use distPath for browser-specific output)
  setupOutputConfig(config, resolvedConfig, publicDir, distPath);
}

/**
 * Main entry plugin function.
 * @param resolvedConfig - Resolved Addfox configuration
 * @param entries - Discovered entries
 * @param distPath - Output directory path (browser-specific, e.g., .addfox/extension/extension-chromium)
 */
export type EntryPluginDevOptions = {
  /** When Firefox and hot reload is on, disable Rspack HMR (use web-ext reload instead). */
  browser?: BrowserTarget;
};

function shouldDisableRspackHmrForFirefox(
  browser: BrowserTarget | undefined,
  hotReload: AddfoxResolvedConfig["hotReload"]
): boolean {
  if (browser !== "firefox") return false;
  return hotReload !== false;
}

export function entryPlugin(
  resolvedConfig: AddfoxResolvedConfig,
  entries: EntryInfo[],
  distPath: string,
  devOptions?: EntryPluginDevOptions
) {
  const { outputRoot, root, appDir } = resolvedConfig;
  const publicDir = resolve(root, "public");

  // Build all lookup maps and configurations
  const entry = buildSourceEntry(entries);
  const entryNames = new Set(Object.keys(entry));
  const templateMap = createTemplateMap(entries);
  const scriptInjectMap = createScriptInjectMap(entries);
  const outputMap = buildEntryOutputMap(entries, appDir);
  const entryByName = new Map(entries.map((e) => [e.name, e]));
  const htmlPaths = entries.filter((e) => e.htmlPath).map((e) => e.htmlPath!);

  const modifyConfigContext = {
    entry,
    templateMap,
    scriptInjectMap,
    outputMap,
    entryByName,
    htmlPaths,
    resolvedConfig,
    publicDir,
    distPath,
  };

  return {
    name: "rsbuild-plugin-extension-entry",
    setup(api: RsbuildPluginAPI) {
      api.modifyRsbuildConfig((config) => {
        modifyRsbuildConfig(config, modifyConfigContext);
      });

      api.onBeforeCreateCompiler(async ({ bundlerConfigs }) => {
        const bundlerConfig = bundlerConfigs[0];
        if (!bundlerConfig) return;

        setupRspackConfig(bundlerConfig, {
          root,
          outputRoot,
          outDir: distPath,
          htmlPaths,
          outputMap,
          entryNames,
          hotReloadDisabled:
            isHotReloadDisabled(resolvedConfig.hotReload) ||
            shouldDisableRspackHmrForFirefox(devOptions?.browser, resolvedConfig.hotReload),
        });
      });
    },
  };
}
