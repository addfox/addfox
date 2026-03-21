import { describe, expect, it, beforeEach, afterEach } from "@rstest/core";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { entryPlugin, buildJsChunkFilenameFn, buildCssChunkFilenameFn, SHARED_VENDOR_CHUNK_NAME } from "../src/index.ts";
import type { AddfoxResolvedConfig } from "@addfox/core";
import type { EntryInfo } from "@addfox/core";

function createMockConfig(root: string, overrides?: Partial<AddfoxResolvedConfig>): AddfoxResolvedConfig {
  return {
    root,
    appDir: "src",
    outDir: "dist",
    outputRoot: ".",
    manifest: {},
    ...overrides,
  } as unknown as AddfoxResolvedConfig;
}

function createMockEntries(root: string): EntryInfo[] {
  return [
    { name: "background", scriptPath: resolve(root, "src/background/index.ts"), htmlPath: undefined },
    { name: "popup", scriptPath: resolve(root, "src/popup/index.ts"), htmlPath: resolve(root, "src/popup/index.html") },
  ];
}

describe("plugin-extension-entry", () => {
  let testRoot: string;

  beforeEach(() => {
    testRoot = resolve(tmpdir(), `addfox-entry-plugin-${Date.now()}`);
    mkdirSync(testRoot, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testRoot)) rmSync(testRoot, { recursive: true, force: true });
  });

  it("returns plugin with name rsbuild-plugin-extension-entry", () => {
    const config = createMockConfig("/app");
    const entries = createMockEntries("/app");
    const plugin = entryPlugin(config, entries, "./dist");
    expect(plugin.name).toBe("rsbuild-plugin-extension-entry");
    expect(plugin.setup).toBeDefined();
    expect(typeof plugin.setup).toBe("function");
  });

  it("setup modifyRsbuildConfig merges entry and html config", () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));

    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };

    plugin.setup(api as never);
    expect(modifyCb).not.toBeNull();

    const rsbuildConfig: Record<string, unknown> = {};
    modifyCb!(rsbuildConfig);

    expect(rsbuildConfig.source).toBeDefined();
    expect((rsbuildConfig.source as Record<string, unknown>).entry).toBeDefined();
    const entry = (rsbuildConfig.source as Record<string, unknown>).entry as Record<string, unknown>;
    expect(entry.background).toEqual({ import: resolve(testRoot, "src/background/index.ts"), html: false });
    expect(entry.popup).toBe(resolve(testRoot, "src/popup/index.ts"));

    expect(rsbuildConfig.html).toBeDefined();
    expect(typeof (rsbuildConfig.html as Record<string, unknown>).template).toBe("function");

    expect(rsbuildConfig.output).toBeDefined();
    expect((rsbuildConfig.output as Record<string, unknown>).distPath).toBeDefined();
  });

  it("setup html.template returns templatePath from templateMap", () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));

    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };

    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = {};
    modifyCb!(rsbuildConfig);

    const templateFn = (rsbuildConfig.html as Record<string, unknown>).template as (opts: { entryName: string }) => string | undefined;
    const result = templateFn({ value: "", entryName: "popup" });
    expect(result).toBe(resolve(testRoot, "src/popup/index.html"));
  });

  it("setup onBeforeCreateCompiler with watchOptions.ignored missing uses distPath only", async () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = {
      plugins: [],
      watchOptions: {},
      output: {},
      optimization: { splitChunks: {} },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    const ignored = (bundlerConfig.watchOptions as Record<string, unknown>).ignored;
    expect(Array.isArray(ignored)).toBe(true);
    expect((ignored as unknown[]).length).toBe(1);
  });

  it("setup onBeforeCreateCompiler sets watchOptions and output", async () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));

    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };

    plugin.setup(api as never);
    const bundlerConfig = {
      plugins: [],
      watchOptions: {},
      output: {},
      optimization: { splitChunks: {} },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });

    expect(bundlerConfig.watchOptions).toBeDefined();
    expect((bundlerConfig.watchOptions as Record<string, unknown>).ignored).toBeDefined();
    expect(bundlerConfig.output).toBeDefined();
    expect((bundlerConfig.output as Record<string, unknown>).path).toBe(resolve(testRoot, "dist"));
    expect((bundlerConfig.output as Record<string, unknown>).filename).toBeDefined();
  });

  it("setup adds public copy when public dir exists", () => {
    const publicDir = resolve(testRoot, "public");
    mkdirSync(publicDir, { recursive: true });
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));

    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };

    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = { output: {} };
    modifyCb!(rsbuildConfig);

    const copy = (rsbuildConfig.output as Record<string, unknown>).copy as unknown[];
    expect(Array.isArray(copy)).toBe(true);
    expect(copy.some((c: { from?: string }) => c.from === publicDir)).toBe(true);
  });

  it("setup html.template calls prevTemplate when entryName not in templateMap", () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));

    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const prevTemplateReturn = "/custom.html";
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };

    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = {
      html: { template: (opts: { entryName: string }) => (opts.entryName === "custom" ? prevTemplateReturn : undefined) },
    };
    modifyCb!(rsbuildConfig);

    const templateFn = (rsbuildConfig.html as Record<string, unknown>).template as (opts: { entryName: string; value: string }) => string | undefined;
    const result = templateFn({ value: "", entryName: "custom" });
    expect(result).toBe(prevTemplateReturn);
  });

  it("setup tools.htmlPlugin calls prevHtmlPlugin when provided", () => {
    const popupDir = resolve(testRoot, "src", "popup");
    mkdirSync(popupDir, { recursive: true });
    const templatePath = resolve(popupDir, "index.html");
    writeFileSync(templatePath, "<html></html>", "utf-8");
    const config = createMockConfig(testRoot);
    const entries: EntryInfo[] = [
      { name: "popup", scriptPath: resolve(popupDir, "index.ts"), htmlPath: templatePath },
    ];
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));

    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };

    plugin.setup(api as never);
    let prevHtmlPluginCalled = false;
    const rsbuildConfig: Record<string, unknown> = {
      tools: {
        htmlPlugin: (_htmlConfig: unknown, _ctx: unknown) => {
          prevHtmlPluginCalled = true;
        },
      },
    };
    modifyCb!(rsbuildConfig);

    const htmlPluginFn = (rsbuildConfig.tools as Record<string, unknown>).htmlPlugin as (
      htmlConfig: Record<string, unknown>,
      ctx: { entryName: string }
    ) => void;
    const htmlConfig: Record<string, unknown> = { template: templatePath };
    htmlPluginFn(htmlConfig, { entryName: "popup" });
    expect(prevHtmlPluginCalled).toBe(true);
  });

  it("setup onBeforeCreateCompiler with existing output and optimization", async () => {
    const config = createMockConfig(testRoot, { hotReload: false });
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));

    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };

    plugin.setup(api as never);
    const bundlerConfig = {
      plugins: [{ name: "HotModuleReplacementPlugin" }],
      devServer: { hot: true },
      watchOptions: { ignored: "foo" },
      output: { path: "", filename: "" },
      optimization: { splitChunks: { chunks: () => true } },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });

    expect(bundlerConfig.devServer.hot).toBe(false);
    expect(Array.isArray(bundlerConfig.plugins)).toBe(true);
    expect((bundlerConfig.plugins as unknown[]).length).toBe(1);
    expect((bundlerConfig.plugins as { name?: string }[])[0].name).toBe("rsbuild-plugin-extension-entry:watch-templates");
    expect((bundlerConfig.output as Record<string, unknown>).filename).toBeDefined();
    expect((bundlerConfig.optimization.splitChunks as Record<string, unknown>).chunks).toBeDefined();
  });

  it("setup modifyRsbuildConfig sets chunkSplit.override with sharedVendor cacheGroup", () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));

    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };

    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = {};
    modifyCb!(rsbuildConfig);

    const chunkSplit = (rsbuildConfig.performance as Record<string, unknown>)?.chunkSplit as Record<string, unknown> | undefined;
    expect(chunkSplit?.override).toBeDefined();
    const overrideObj = chunkSplit?.override as Record<string, unknown>;
    expect(overrideObj.chunks).toBe("all");
    const cacheGroups = overrideObj.cacheGroups as Record<string, unknown>;
    expect(cacheGroups).toBeDefined();
    const sharedVendor = cacheGroups[SHARED_VENDOR_CHUNK_NAME] as Record<string, unknown>;
    expect(sharedVendor).toBeDefined();
    expect(sharedVendor.name).toBe(SHARED_VENDOR_CHUNK_NAME);
    expect(sharedVendor.priority).toBe(30);
    expect(sharedVendor.enforce).toBe(true);
    expect(sharedVendor.test).toBeInstanceOf(RegExp);
  });

  it("setup onBeforeCreateCompiler removes HMR plugin by constructor.name when hotReload is disabled", async () => {
    const config = createMockConfig(testRoot, { hotReload: false });
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const hmrByConstructor = { constructor: { name: "HotModuleReplacementPlugin" } };
    const bundlerConfig = {
      plugins: [hmrByConstructor],
      devServer: {},
      watchOptions: {},
      output: {},
      optimization: { splitChunks: {} },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    expect((bundlerConfig.plugins as unknown[]).length).toBe(1);
    expect((bundlerConfig.plugins as { name?: string }[])[0].name).toBe("rsbuild-plugin-extension-entry:watch-templates");
  });

  it("setup onBeforeCreateCompiler does not remove HMR plugin when hotReload is undefined", async () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const hmrPlugin = { constructor: { name: "HotModuleReplacementPlugin" } };
    const bundlerConfig = {
      plugins: [hmrPlugin],
      devServer: { hot: true },
      watchOptions: {},
      output: {},
      optimization: { splitChunks: {} },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    expect((bundlerConfig.plugins as unknown[]).length).toBe(2);
    expect((bundlerConfig.plugins as { constructor?: { name?: string } }[])[0].constructor?.name).toBe("HotModuleReplacementPlugin");
    expect(bundlerConfig.devServer).toEqual({ hot: true });
  });

  it("setup onBeforeCreateCompiler does not remove HMR plugin when hotReload is object (enabled)", async () => {
    const config = createMockConfig(testRoot, { hotReload: { port: 23333 } });
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const hmrPlugin = { constructor: { name: "HotModuleReplacementPlugin" } };
    const bundlerConfig = {
      plugins: [hmrPlugin],
      devServer: { hot: true },
      watchOptions: {},
      output: {},
      optimization: { splitChunks: {} },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    expect((bundlerConfig.plugins as unknown[]).length).toBe(2);
    expect((bundlerConfig.plugins as { constructor?: { name?: string } }[])[0].constructor?.name).toBe("HotModuleReplacementPlugin");
    expect(bundlerConfig.devServer).toEqual({ hot: true });
  });

  it("setup tools.htmlPlugin sets filename and preserves template (no stripping)", () => {
    const popupDir = resolve(testRoot, "src", "popup");
    mkdirSync(popupDir, { recursive: true });
    const templatePath = resolve(popupDir, "index.html");
    writeFileSync(
      templatePath,
      '<html><head><style>body{color:red}</style></head><body><div id="app"></div><script type="module" src="./index.ts"></script></body></html>',
      "utf-8"
    );
    const config = createMockConfig(testRoot);
    const entries: EntryInfo[] = [
      { name: "popup", scriptPath: resolve(popupDir, "index.ts"), htmlPath: templatePath },
    ];
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));

    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };

    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = {};
    modifyCb!(rsbuildConfig);

    const htmlPluginFn = (rsbuildConfig.tools as Record<string, unknown>)?.htmlPlugin as (
      htmlConfig: Record<string, unknown>,
      ctx: { entryName: string }
    ) => void;
    expect(typeof htmlPluginFn).toBe("function");

    const htmlConfig: Record<string, unknown> = { template: templatePath };
    htmlPluginFn(htmlConfig, { entryName: "popup" });

    expect(htmlConfig.filename).toBe("popup/index.html");
    // template is left as-is; no templateContent replacement
    expect(htmlConfig.template).toBe(templatePath);
    expect(htmlConfig.templateContent).toBeUndefined();
  });

  it("setup html.template returns undefined when entryName not in templateMap and no prevTemplate", () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = { html: {} };
    modifyCb!(rsbuildConfig);
    const templateFn = (rsbuildConfig.html as Record<string, unknown>).template as (opts: { entryName: string }) => string | undefined;
    const result = templateFn({ value: "", entryName: "unknown" });
    expect(result).toBeUndefined();
  });

  it("setup tools.htmlPlugin when no prevHtmlPlugin still sets filename for known entry", () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = { tools: {} };
    modifyCb!(rsbuildConfig);
    const htmlPluginFn = (rsbuildConfig.tools as Record<string, unknown>).htmlPlugin as (
      htmlConfig: Record<string, unknown>,
      ctx: { entryName: string }
    ) => void;
    const htmlConfig: Record<string, unknown> = {};
    htmlPluginFn(htmlConfig, { entryName: "popup" });
    expect(htmlConfig.filename).toBe("popup/index.html");
  });

  it("setup tools.htmlPlugin does not set filename when entryName has no html in outputMap", () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = { tools: {} };
    modifyCb!(rsbuildConfig);
    const htmlPluginFn = (rsbuildConfig.tools as Record<string, unknown>).htmlPlugin as (
      htmlConfig: Record<string, unknown>,
      ctx: { entryName: string }
    ) => void;
    const htmlConfig: Record<string, unknown> = {};
    htmlPluginFn(htmlConfig, { entryName: "background" });
    expect(htmlConfig.filename).toBeUndefined();
  });

  it("setup tools.htmlPlugin when template path does not exist does not set templateContent", () => {
    const config = createMockConfig(testRoot);
    const entries: EntryInfo[] = [
      { name: "popup", scriptPath: resolve(testRoot, "src/popup/index.ts"), htmlPath: resolve(testRoot, "src/popup/missing.html") },
    ];
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = {};
    modifyCb!(rsbuildConfig);
    const htmlPluginFn = (rsbuildConfig.tools as Record<string, unknown>).htmlPlugin as (
      htmlConfig: Record<string, unknown>,
      ctx: { entryName: string }
    ) => void;
    const htmlConfig: Record<string, unknown> = { template: resolve(testRoot, "src/popup/missing.html") };
    htmlPluginFn(htmlConfig, { entryName: "popup" });
    expect(htmlConfig.templateContent).toBeUndefined();
  });

  it("setup tools.htmlPlugin when entry has scriptInject and html has data-addfox-entry sets templateContent", () => {
    const popupDir = resolve(testRoot, "src", "popup");
    mkdirSync(popupDir, { recursive: true });
    const templatePath = resolve(popupDir, "index.html");
    writeFileSync(
      templatePath,
      '<html><head></head><body><div id="app"></div><script data-addfox-entry src="./index.ts"></script></body></html>',
      "utf-8"
    );
    const config = createMockConfig(testRoot);
    const entries: EntryInfo[] = [
      {
        name: "popup",
        scriptPath: resolve(popupDir, "index.ts"),
        htmlPath: templatePath,
        scriptInject: "body" as const,
      },
    ];
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = {};
    modifyCb!(rsbuildConfig);
    const htmlPluginFn = (rsbuildConfig.tools as Record<string, unknown>).htmlPlugin as (
      htmlConfig: Record<string, unknown>,
      ctx: { entryName: string }
    ) => void;
    const htmlConfig: Record<string, unknown> = {};
    htmlPluginFn(htmlConfig, { entryName: "popup" });
    expect(htmlConfig.templateContent).toBeDefined();
    expect((htmlConfig.templateContent as string)).not.toContain("data-addfox-entry");
    expect((htmlConfig.templateContent as string)).toContain("<div id=\"app\">");
  });

  it("setup tools.htmlPlugin when entry has scriptInject and HTML has no data-addfox-entry sets templateContent to full HTML", () => {
    const popupDir = resolve(testRoot, "src", "popup");
    mkdirSync(popupDir, { recursive: true });
    const templatePath = resolve(popupDir, "index.html");
    writeFileSync(templatePath, "<html><body><div id=\"app\"></div><script src=\"./index.ts\"></script></body></html>", "utf-8");
    const config = createMockConfig(testRoot);
    const entries: EntryInfo[] = [
      {
        name: "popup",
        scriptPath: resolve(popupDir, "index.ts"),
        htmlPath: templatePath,
        scriptInject: "body" as const,
      },
    ];
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = {};
    modifyCb!(rsbuildConfig);
    const htmlPluginFn = (rsbuildConfig.tools as Record<string, unknown>).htmlPlugin as (
      htmlConfig: Record<string, unknown>,
      ctx: { entryName: string }
    ) => void;
    const htmlConfig: Record<string, unknown> = {};
    htmlPluginFn(htmlConfig, { entryName: "popup" });
    // scriptInject entry with htmlPath gets templateContent (stripped or full HTML) for injection
    expect(htmlConfig.templateContent).toBeDefined();
    expect(typeof htmlConfig.templateContent).toBe("string");
  });

  it("setup html.inject returns head for entry not in scriptInjectMap", () => {
    const config = createMockConfig(testRoot);
    const entries: EntryInfo[] = [
      { name: "popup", scriptPath: resolve(testRoot, "src/popup/index.ts"), htmlPath: resolve(testRoot, "src/popup/index.html"), scriptInject: "body" as const },
      { name: "options", scriptPath: resolve(testRoot, "src/options/index.ts"), htmlPath: resolve(testRoot, "src/options/index.html") },
    ];
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = {};
    modifyCb!(rsbuildConfig);
    const injectFn = (rsbuildConfig.html as Record<string, unknown>).inject as (opts: { entryName: string }) => string;
    expect(injectFn({ entryName: "options" })).toBe("head");
    expect(injectFn({ entryName: "popup" })).toBe("body");
  });

  it("setup modifyRsbuildConfig with dev.watchFiles.paths as string merges paths", () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup(api as never);
    const htmlPath = resolve(testRoot, "src/popup/index.html");
    const rsbuildConfig: Record<string, unknown> = {
      dev: { watchFiles: { paths: "/single/path" } },
    };
    modifyCb!(rsbuildConfig);
    const watchFiles = (rsbuildConfig.dev as Record<string, unknown>).watchFiles as { paths?: string[] };
    expect(Array.isArray(watchFiles.paths)).toBe(true);
    expect(watchFiles.paths).toContain("/single/path");
    expect(watchFiles.paths).toContain(htmlPath);
  });

  it("setup modifyRsbuildConfig with dev.watchFiles.paths as array merges paths", () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup(api as never);
    const htmlPath = resolve(testRoot, "src/popup/index.html");
    const rsbuildConfig: Record<string, unknown> = {
      dev: { watchFiles: { paths: ["/a", "/b"] } },
    };
    modifyCb!(rsbuildConfig);
    const watchFiles = (rsbuildConfig.dev as Record<string, unknown>).watchFiles as { paths?: string[] };
    expect(watchFiles.paths).toContain("/a");
    expect(watchFiles.paths).toContain(htmlPath);
  });

  it("setup modifyRsbuildConfig merges with existing output.distPath object", () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, "./dist");
    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = {
      output: { distPath: { root: "/old", html: "/old-html" } },
    };
    modifyCb!(rsbuildConfig);
    const distPath = (rsbuildConfig.output as Record<string, unknown>).distPath as Record<string, unknown>;
    expect(distPath.root).toBe("./dist");
    expect(distPath.html).toBe("/old-html");
  });

  it("setup modifyRsbuildConfig appends to existing output.copy array", () => {
    const publicDir = resolve(testRoot, "public");
    mkdirSync(publicDir, { recursive: true });
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup(api as never);
    const existingCopy = { from: "/existing" };
    const rsbuildConfig: Record<string, unknown> = { output: { copy: [existingCopy] } };
    modifyCb!(rsbuildConfig);
    const copy = (rsbuildConfig.output as Record<string, unknown>).copy as unknown[];
    expect(Array.isArray(copy)).toBe(true);
    expect(copy).toHaveLength(2);
    expect((copy[0] as { from: string }).from).toBe("/existing");
    expect((copy[1] as { from: string }).from).toBe(publicDir);
  });

  it("setup onBeforeCreateCompiler returns early when bundlerConfigs[0] is missing", async () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    await onBeforeCb!({ bundlerConfigs: [] });
    expect(true).toBe(true);
  });

  it("setup onBeforeCreateCompiler watch-html-templates plugin add fileDependencies when path exists", async () => {
    const popupDir = resolve(testRoot, "src", "popup");
    mkdirSync(popupDir, { recursive: true });
    const htmlPath = resolve(popupDir, "index.html");
    writeFileSync(htmlPath, "<html></html>", "utf-8");
    const config = createMockConfig(testRoot);
    const entries: EntryInfo[] = [
      { name: "popup", scriptPath: resolve(popupDir, "index.ts"), htmlPath },
    ];
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = {
      plugins: [] as unknown[],
      watchOptions: {},
      output: {},
      optimization: { splitChunks: {} },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    const watchPlugin = (bundlerConfig.plugins as { name?: string; apply?: (compiler: unknown) => void }[]).find(
      (p) => p.name === "rsbuild-plugin-extension-entry:watch-templates"
    );
    expect(watchPlugin).toBeDefined();
    const added: string[] = [];
    const mockCompiler = {
      hooks: {
        compilation: {
          tap: (_name: string, fn: (compilation: { fileDependencies: { add: (p: string) => void } }) => void) => {
            fn({ fileDependencies: { add: (p: string) => added.push(p) } });
          },
        },
      },
    };
    watchPlugin!.apply!(mockCompiler);
    expect(added).toContain(htmlPath);
  });

  it("setup onBeforeCreateCompiler with watchOptions.ignored as single value", async () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = {
      plugins: [],
      watchOptions: { ignored: "foo" as unknown },
      output: {},
      optimization: { splitChunks: {} },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    const ignored = (bundlerConfig.watchOptions as Record<string, unknown>).ignored;
    expect(Array.isArray(ignored)).toBe(true);
    expect((ignored as unknown[]).length).toBe(2);
  });

  it("setup onBeforeCreateCompiler with watchOptions.ignored as array", async () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = {
      plugins: [],
      watchOptions: { ignored: ["/node_modules", "/.git"] },
      output: {},
      optimization: { splitChunks: {} },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    const ignored = (bundlerConfig.watchOptions as Record<string, unknown>).ignored as unknown[];
    expect(Array.isArray(ignored)).toBe(true);
    expect(ignored).toHaveLength(3);
    expect(ignored[0]).toBe("/node_modules");
    expect(ignored[1]).toBe("/.git");
    expect(ignored[2]).toBe(resolve(testRoot, "dist"));
  });

  it("setup onBeforeCreateCompiler skips optimization when c.optimization is missing", async () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = {
      plugins: [],
      watchOptions: {},
      output: { path: "", filename: "" },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    expect((bundlerConfig.output as Record<string, unknown>).path).toBe(resolve(testRoot, "dist"));
    expect((bundlerConfig as Record<string, unknown>).optimization).toBeUndefined();
  });

  it("setup onBeforeCreateCompiler skips output when c.output is missing", async () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = {
      plugins: [],
      watchOptions: {},
      optimization: { splitChunks: {} },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    expect((bundlerConfig as Record<string, unknown>).output).toBeUndefined();
  });

  it("setup onBeforeCreateCompiler keeps existing chunkFilename and cssChunkFilename", async () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const customChunk = "custom/chunk.js";
    const customCssChunk = "custom/chunk.css";
    const bundlerConfig = {
      plugins: [],
      watchOptions: {},
      output: {
        chunkFilename: customChunk,
        cssChunkFilename: customCssChunk,
      },
      optimization: { splitChunks: {} },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    expect((bundlerConfig.output as Record<string, unknown>).chunkFilename).toBe(customChunk);
    expect((bundlerConfig.output as Record<string, unknown>).cssChunkFilename).toBe(customCssChunk);
  });

  it("setup onBeforeCreateCompiler keeps existing splitChunks.chunks when function", async () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const existingChunksFn = () => true;
    const bundlerConfig = {
      plugins: [],
      watchOptions: {},
      output: {},
      optimization: { splitChunks: { chunks: existingChunksFn } },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    expect((bundlerConfig.optimization.splitChunks as Record<string, unknown>).chunks).toBe(existingChunksFn);
  });

  it("setup onBeforeCreateCompiler disableRspackHmr when hotReload is disabled and devServer is undefined", async () => {
    const config = createMockConfig(testRoot, { hotReload: false });
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = {
      plugins: [],
      watchOptions: {},
      output: {},
      optimization: { splitChunks: {} },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    expect((bundlerConfig as Record<string, unknown>).devServer).toEqual({ hot: false });
  });

  it("setup onBeforeCreateCompiler splitChunks.chunks as default when not function", async () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = {
      plugins: [],
      watchOptions: {},
      output: { path: "", filename: "" },
      optimization: { splitChunks: {} },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    const chunksFn = (bundlerConfig.optimization.splitChunks as Record<string, unknown>).chunks;
    expect(typeof chunksFn).toBe("function");
    const fn = chunksFn as (chunk: { name?: string }) => boolean;
    expect(fn({ name: "background" })).toBe(false);
    expect(fn({ name: "popup" })).toBe(true);
    expect(fn({})).toBe(true);
  });

  it("setup onBeforeCreateCompiler output.filename/cssFilename use chunk.id when chunk.name missing", async () => {
    const config = createMockConfig(testRoot);
    const entries = createMockEntries(testRoot);
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = {
      plugins: [],
      watchOptions: {},
      output: {},
      optimization: { splitChunks: {} },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    const filenameFn = (bundlerConfig.output as Record<string, unknown>).filename as (pathData: { chunk?: { name?: string; id?: string } }) => string;
    const cssFilenameFn = (bundlerConfig.output as Record<string, unknown>).cssFilename as (pathData: { chunk?: { name?: string; id?: string } }) => string;
    expect(filenameFn({ chunk: { id: "vendor" } })).toBe("static/js/vendor.js");
    expect(filenameFn({ chunk: { name: SHARED_VENDOR_CHUNK_NAME } })).toBe("static/js/shared-vendor.js");
    expect(filenameFn({ chunk: { id: SHARED_VENDOR_CHUNK_NAME } })).toBe("static/js/shared-vendor.js");
    expect(filenameFn({ chunk: {} })).toBe("static/js/chunk.js");
    expect(filenameFn({ chunk: { id: "popup" } })).toBe("popup/index.js");
    expect(cssFilenameFn({ chunk: { id: "styles" } })).toBe("static/css/styles.css");
    expect(cssFilenameFn({ chunk: { name: "popup" } })).toBe("popup/index.css");
    expect(cssFilenameFn({ chunk: { id: "popup" } })).toBe("popup/index.css");
  });

  it("buildJsChunkFilenameFn returns fallback when outputMap.js[entryName] is undefined", () => {
    const entryNames = new Set(["popup"]);
    const outputMap = { js: { popup: undefined as unknown as string }, css: {}, html: {} };
    const fn = buildJsChunkFilenameFn(outputMap, entryNames);
    expect(fn({ chunk: { name: "popup" } })).toBe("popup/index.js");
    expect(fn({ chunk: { id: "other" } })).toBe("static/js/other.js");
  });

  it("buildCssChunkFilenameFn returns fallback when outputMap.css[entryName] is undefined", () => {
    const entryNames = new Set(["popup"]);
    const outputMap = { css: { popup: undefined as unknown as string }, js: {}, html: {} };
    const fn = buildCssChunkFilenameFn(outputMap, entryNames);
    expect(fn({ chunk: { name: "popup" } })).toBe("popup/index.css");
    expect(fn({ chunk: { id: "vendor" } })).toBe("static/css/vendor.css");
  });

  it("entry with outputFollowsScriptPath but no htmlPath skips html output", async () => {
    const appDir = resolve(testRoot, "src");
    const contentDir = resolve(appDir, "content");
    mkdirSync(contentDir, { recursive: true });
    const config = {
      ...createMockConfig(testRoot),
      appDir,
    } as unknown as AddfoxResolvedConfig;
    const entries: EntryInfo[] = [
      {
        name: "content",
        scriptPath: resolve(contentDir, "index.ts"),
        htmlPath: undefined,
        outputFollowsScriptPath: true,
      } as EntryInfo,
    ];
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: () => {},
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => { onBeforeCb = cb; },
    };
    plugin.setup(api as never);
    const bundlerConfig = {
      plugins: [] as unknown[],
      watchOptions: {},
      output: {},
      optimization: { splitChunks: {} },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    const filenameFn = (bundlerConfig.output as Record<string, unknown>).filename as (
      pathData: { chunk?: { name?: string } }
    ) => string;
    expect(filenameFn({ chunk: { name: "content" } })).toBe("content/index.js");
  });

  it("html output for entry where html file matches entry name (isSingleHtml)", () => {
    const otherDir = resolve(testRoot, "src", "other-dir");
    mkdirSync(otherDir, { recursive: true });
    const htmlPath = resolve(otherDir, "options.html");
    writeFileSync(htmlPath, "<html></html>", "utf-8");
    const config = createMockConfig(testRoot);
    const entries: EntryInfo[] = [
      { name: "options", scriptPath: resolve(testRoot, "src/options.ts"), htmlPath },
    ];
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => { modifyCb = cb; },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = {};
    modifyCb!(rsbuildConfig);
    const htmlPluginFn = (rsbuildConfig.tools as Record<string, unknown>).htmlPlugin as (
      htmlConfig: Record<string, unknown>,
      ctx: { entryName: string }
    ) => void;
    const htmlConfig: Record<string, unknown> = {};
    htmlPluginFn(htmlConfig, { entryName: "options" });
    expect(htmlConfig.filename).toBe("options.html");
  });

  it("entry with outputFollowsScriptPath uses relative script path for output filenames", async () => {
    const appDir = resolve(testRoot, "src");
    const sandboxDir = resolve(appDir, "sandbox");
    mkdirSync(sandboxDir, { recursive: true });
    const htmlPath = resolve(sandboxDir, "index.html");
    writeFileSync(htmlPath, "<html></html>", "utf-8");
    const config = {
      ...createMockConfig(testRoot),
      appDir,
    } as unknown as AddfoxResolvedConfig;
    const entries: EntryInfo[] = [
      {
        name: "sandbox",
        scriptPath: resolve(sandboxDir, "index.ts"),
        htmlPath,
        outputFollowsScriptPath: true,
      } as EntryInfo,
    ];
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));

    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => { modifyCb = cb; },
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => { onBeforeCb = cb; },
    };

    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = {};
    modifyCb!(rsbuildConfig);

    const htmlPluginFn = (rsbuildConfig.tools as Record<string, unknown>).htmlPlugin as (
      htmlConfig: Record<string, unknown>,
      ctx: { entryName: string }
    ) => void;
    const htmlConfig: Record<string, unknown> = {};
    htmlPluginFn(htmlConfig, { entryName: "sandbox" });
    expect(htmlConfig.filename).toBe("sandbox/index.html");

    const bundlerConfig = {
      plugins: [] as unknown[],
      watchOptions: {},
      output: {},
      optimization: { splitChunks: {} },
    };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    const filenameFn = (bundlerConfig.output as Record<string, unknown>).filename as (
      pathData: { chunk?: { name?: string } }
    ) => string;
    const cssFilenameFn = (bundlerConfig.output as Record<string, unknown>).cssFilename as (
      pathData: { chunk?: { name?: string } }
    ) => string;
    expect(filenameFn({ chunk: { name: "sandbox" } })).toBe("sandbox/index.js");
    expect(cssFilenameFn({ chunk: { name: "sandbox" } })).toBe("sandbox/index.css");
  });

  it("buildFilenameMap for custom entry with htmlPath", () => {
    const customDir = resolve(testRoot, "src", "custom");
    mkdirSync(customDir, { recursive: true });
    const htmlPath = resolve(customDir, "page.html");
    writeFileSync(htmlPath, "<html></html>", "utf-8");
    const config = createMockConfig(testRoot);
    const entries: EntryInfo[] = [
      ...createMockEntries(testRoot),
      { name: "custom", scriptPath: resolve(customDir, "index.ts"), htmlPath },
    ];
    const plugin = entryPlugin(config, entries, resolve(testRoot, "dist"));
    let modifyCb: ((config: Record<string, unknown>) => void) | null = null;
    const api = {
      modifyRsbuildConfig: (cb: (config: Record<string, unknown>) => void) => {
        modifyCb = cb;
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup(api as never);
    const rsbuildConfig: Record<string, unknown> = {};
    modifyCb!(rsbuildConfig);
    const htmlPluginFn = (rsbuildConfig.tools as Record<string, unknown>).htmlPlugin as (
      htmlConfig: Record<string, unknown>,
      ctx: { entryName: string }
    ) => void;
    const htmlConfig: Record<string, unknown> = {};
    htmlPluginFn(htmlConfig, { entryName: "custom" });
    expect(htmlConfig.filename).toBe("custom/page.html");
  });
});
