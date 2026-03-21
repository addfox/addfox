import { describe, expect, it, beforeEach, afterEach } from "@rstest/core";
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { extensionPlugin } from "../src/index.ts";
import type { AddfoxResolvedConfig } from "@addfox/core";
import type { EntryInfo } from "@addfox/core";

function createMockConfig(root: string): AddfoxResolvedConfig {
  return {
    root,
    outDir: "dist",
    outputRoot: ".",
    manifest: { name: "Test", version: "1.0.0", manifest_version: 3 },
  } as unknown as AddfoxResolvedConfig;
}

function createMockEntries(): EntryInfo[] {
  return [
    { name: "background", scriptPath: "/app/src/background/index.ts", htmlPath: undefined },
  ];
}

async function waitForFileContains(
  filePath: string,
  needle: string,
  maxRetries = 25
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, "utf-8");
      if (content.includes(needle)) return content;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 10));
  }
  return existsSync(filePath) ? readFileSync(filePath, "utf-8") : "";
}

describe("plugin-extension", () => {
  let testRoot: string;

  beforeEach(() => {
    testRoot = resolve(tmpdir(), `addfox-ext-plugin-${Date.now()}`);
    mkdirSync(testRoot, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testRoot)) rmSync(testRoot, { recursive: true, force: true });
  });

  it("returns plugin with name rsbuild-plugin-extension-manifest", () => {
    const distPath = resolve("/app", "dist");
    const config = createMockConfig("/app");
    const entries = createMockEntries();
    const plugin = extensionPlugin(config, entries, "chromium", distPath);
    expect(plugin.name).toBe("rsbuild-plugin-extension-manifest");
    expect(plugin.setup).toBeDefined();
    expect(typeof plugin.setup).toBe("function");
  });

  it("setup registers onBeforeCreateCompiler and write manifest on afterEmit", async () => {
    const distPath = resolve(testRoot, "dist");
    const config = createMockConfig(testRoot);
    config.manifest = { name: "Written", version: "1.0.0", manifest_version: 3 };
    const entries = createMockEntries();
    const plugin = extensionPlugin(config, entries, "chromium", distPath);

    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };

    plugin.setup(api as never);
    expect(onBeforeCb).not.toBeNull();

    const bundlerConfig = {} as Record<string, unknown>;
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });

    expect(Array.isArray(bundlerConfig.plugins)).toBe(true);
    expect((bundlerConfig.plugins as unknown[]).length).toBe(1);
    const postBuildPlugin = (bundlerConfig.plugins as unknown[])[0] as { name: string; apply: (compiler: unknown) => void };
    expect(postBuildPlugin.name).toBe("rsbuild-plugin-extension-manifest:post-build");

    let afterEmitFn: (() => void) | null = null;
    const compiler = {
      hooks: {
        afterEmit: {
          tap: (_name: string, fn: () => void) => {
            afterEmitFn = fn;
          },
        },
      },
    };

    postBuildPlugin.apply(compiler);
    expect(afterEmitFn).not.toBeNull();
    afterEmitFn!();

    const manifestPath = resolve(distPath, "manifest.json");
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(manifest.name).toBe("Written");
  });

  it("setup returns early when bundlerConfigs[0] is missing", async () => {
    const distPath = resolve(testRoot, "dist");
    const config = createMockConfig(testRoot);
    const entries = createMockEntries();
    const plugin = extensionPlugin(config, entries, "chromium", distPath);

    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };

    plugin.setup(api as never);
    await onBeforeCb!({ bundlerConfigs: [] });
    expect(true).toBe(true);
  });

  it("writes firefox manifest when browser is firefox", async () => {
    const distPath = resolve(testRoot, "dist");
    const config = createMockConfig(testRoot);
    config.manifest = {
      chromium: { name: "C" },
      firefox: { name: "F", version: "1.0.0", manifest_version: 3 },
    } as never;
    const entries = createMockEntries();
    const plugin = extensionPlugin(config, entries, "firefox", distPath);

    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };

    plugin.setup(api as never);
    const bundlerConfig = { plugins: [] as unknown[] };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });

    const postBuildPlugin = bundlerConfig.plugins[0] as { apply: (compiler: unknown) => void };
    let afterEmitFn: (() => void) | null = null;
    postBuildPlugin.apply({
      hooks: { afterEmit: { tap: (_: string, fn: () => void) => { afterEmitFn = fn; } } },
    });
    afterEmitFn!();

    const manifestPath = resolve(testRoot, "dist", "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(manifest.name).toBe("F");
  });

  it("when distPath already exists does not fail and still writes manifest", async () => {
    const distPath = resolve(testRoot, "dist");
    mkdirSync(distPath, { recursive: true });
    const config = createMockConfig(testRoot);
    config.manifest = { name: "Exists", version: "1.0.0", manifest_version: 3 };
    const entries = createMockEntries();
    const plugin = extensionPlugin(config, entries, "chromium", distPath);

    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = { plugins: [] as unknown[] };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    const postBuildPlugin = bundlerConfig.plugins[0] as { apply: (compiler: unknown) => void };
    let afterEmitFn: (() => void) | null = null;
    postBuildPlugin.apply({
      hooks: { afterEmit: { tap: (_: string, fn: () => void) => { afterEmitFn = fn; } } },
    });
    afterEmitFn!();

    expect(existsSync(resolve(distPath, "manifest.json"))).toBe(true);
    const manifest = JSON.parse(readFileSync(resolve(distPath, "manifest.json"), "utf-8"));
    expect(manifest.name).toBe("Exists");
  });

  it("pushes post-build plugin when config.plugins already has items", async () => {
    const distPath = resolve(testRoot, "dist");
    const config = createMockConfig(testRoot);
    const entries = createMockEntries();
    const plugin = extensionPlugin(config, entries, "chromium", distPath);
    const existingPlugin = { name: "existing" };
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = { plugins: [existingPlugin] as unknown[] };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });

    expect(bundlerConfig.plugins).toHaveLength(2);
    expect((bundlerConfig.plugins[0] as { name: string }).name).toBe("existing");
    expect((bundlerConfig.plugins[1] as { name: string }).name).toBe("rsbuild-plugin-extension-manifest:post-build");
  });

  it("throws when required HTML entry has html:false (popup)", async () => {
    const distPath = resolve(testRoot, "dist");
    const config = createMockConfig(testRoot);
    config.manifest = { name: "X", version: "1.0.0", manifest_version: 3 };
    const entries: EntryInfo[] = [
      { name: "background", scriptPath: "/app/background/index.ts", htmlPath: undefined },
      { name: "popup", scriptPath: "/app/popup/index.ts", htmlPath: undefined, html: false } as EntryInfo,
    ];
    const plugin = extensionPlugin(config, entries, "chromium", distPath);
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = { plugins: [] as unknown[] };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    const postBuildPlugin = bundlerConfig.plugins[0] as { apply: (compiler: unknown) => void };
    let afterEmitFn: (() => void) | null = null;
    postBuildPlugin.apply({
      hooks: { afterEmit: { tap: (_: string, fn: () => void) => { afterEmitFn = fn; } } },
    });
    expect(afterEmitFn).not.toBeNull();
    expect(() => afterEmitFn!()).toThrow(/must generate HTML/);
  });

  it("throws when MV3 background has html:true", async () => {
    const distPath = resolve(testRoot, "dist");
    const config = createMockConfig(testRoot);
    config.manifest = { name: "X", version: "1.0.0", manifest_version: 3 };
    const entries: EntryInfo[] = [
      { name: "background", scriptPath: "/app/background/index.ts", htmlPath: undefined, html: true } as EntryInfo,
    ];
    const plugin = extensionPlugin(config, entries, "chromium", distPath);
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = { plugins: [] as unknown[] };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    const postBuildPlugin = bundlerConfig.plugins[0] as { apply: (compiler: unknown) => void };
    let afterEmitFn: (() => void) | null = null;
    postBuildPlugin.apply({
      hooks: { afterEmit: { tap: (_: string, fn: () => void) => { afterEmitFn = fn; } } },
    });
    expect(() => afterEmitFn!()).toThrow(/background.*cannot generate HTML/);
  });

  it("calls onWarn when browser is firefox but manifest only has chromium", async () => {
    const distPath = resolve(testRoot, "dist");
    const config = createMockConfig(testRoot);
    config.manifest = {
      chromium: { name: "C", version: "1.0.0", manifest_version: 3 },
    } as never;
    const entries = createMockEntries();
    const plugin = extensionPlugin(config, entries, "firefox", distPath);

    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = { plugins: [] as unknown[] };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });

    const postBuildPlugin = bundlerConfig.plugins[0] as { apply: (compiler: unknown) => void };
    let afterEmitFn: (() => void) | null = null;
    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (msg: string) => { warnings.push(msg); };
    postBuildPlugin.apply({
      hooks: { afterEmit: { tap: (_: string, fn: () => void) => { afterEmitFn = fn; } } },
    });
    afterEmitFn!();
    console.warn = origWarn;

    expect(warnings.length).toBeGreaterThan(0);
    const manifestPath = resolve(testRoot, "dist", "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(manifest.name).toBe("C");
  });

  it("does not auto-fill manifest css when content uses defineShadowContentUI", async () => {
    const distPath = resolve(testRoot, "dist");
    mkdirSync(resolve(testRoot, "app", "content"), { recursive: true });
    mkdirSync(resolve(distPath, "content"), { recursive: true });
    mkdirSync(resolve(distPath, "static", "css"), { recursive: true });
    const contentScriptPath = resolve(testRoot, "app", "content", "index.ts");
    writeFileSync(
      contentScriptPath,
      "import { defineShadowContentUI } from '@addfox/utils';\ndefineShadowContentUI({ name: 'x-ui', target: 'body' });\n",
      "utf-8"
    );
    writeFileSync(resolve(distPath, "content", "index.js"), "console.log('content');", "utf-8");
    writeFileSync(resolve(distPath, "static", "css", "content.hash.css"), ".x{color:red}", "utf-8");

    const config = createMockConfig(testRoot);
    config.manifest = { name: "Shadow", version: "1.0.0", manifest_version: 3 };
    const entries: EntryInfo[] = [{ name: "content", scriptPath: contentScriptPath, htmlPath: undefined }];
    const plugin = extensionPlugin(config, entries, "chromium", distPath);

    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = { plugins: [] as unknown[] };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    const postBuildPlugin = bundlerConfig.plugins[0] as { apply: (compiler: unknown) => void };
    let afterEmitFn: ((compilation: unknown) => void) | null = null;
    postBuildPlugin.apply({
      hooks: { afterEmit: { tap: (_: string, fn: (compilation: unknown) => void) => { afterEmitFn = fn; } } },
    });
    afterEmitFn!({
      getAssets: () => [
        { filename: "content/index.js" },
        { filename: "static/css/content.hash.css" },
      ],
      assets: {
        "content/index.js": {},
        "static/css/content.hash.css": {},
      },
    });

    const manifestPath = resolve(distPath, "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    const contentScript = manifest.content_scripts?.[0];
    expect(contentScript.js).toEqual(["content/index.js"]);
    expect(contentScript.css).toBeUndefined();
  });

  it("auto-fills manifest css when content uses defineContentUI", async () => {
    const distPath = resolve(testRoot, "dist");
    mkdirSync(resolve(testRoot, "app", "content"), { recursive: true });
    mkdirSync(resolve(distPath, "content"), { recursive: true });
    mkdirSync(resolve(distPath, "static", "css"), { recursive: true });
    const contentScriptPath = resolve(testRoot, "app", "content", "index.ts");
    writeFileSync(
      contentScriptPath,
      "import { defineContentUI } from '@addfox/utils';\ndefineContentUI({ tag: 'div', target: 'body' });\n",
      "utf-8"
    );
    writeFileSync(resolve(distPath, "content", "index.js"), "console.log('content');", "utf-8");
    writeFileSync(resolve(distPath, "static", "css", "content.hash.css"), ".x{color:red}", "utf-8");

    const config = createMockConfig(testRoot);
    config.manifest = { name: "Native", version: "1.0.0", manifest_version: 3 };
    const entries: EntryInfo[] = [{ name: "content", scriptPath: contentScriptPath, htmlPath: undefined }];
    const plugin = extensionPlugin(config, entries, "chromium", distPath);

    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = { plugins: [] as unknown[] };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    const postBuildPlugin = bundlerConfig.plugins[0] as { apply: (compiler: unknown) => void };
    let afterEmitFn: ((compilation: unknown) => void) | null = null;
    postBuildPlugin.apply({
      hooks: { afterEmit: { tap: (_: string, fn: (compilation: unknown) => void) => { afterEmitFn = fn; } } },
    });
    afterEmitFn!({
      getAssets: () => [
        { filename: "content/index.js" },
        { filename: "static/css/content.hash.css" },
      ],
      assets: {
        "content/index.js": {},
        "static/css/content.hash.css": {},
      },
    });

    const manifestPath = resolve(distPath, "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    const contentScript = manifest.content_scripts?.[0];
    expect(contentScript.js).toEqual(["content/index.js"]);
    expect(contentScript.css).toEqual(["static/css/content.hash.css"]);
  });

  async function getAfterEmitFn(
    config: AddfoxResolvedConfig,
    entries: EntryInfo[],
    browser: "chromium" | "firefox" = "chromium",
    distPath?: string
  ): Promise<(compilation: unknown) => void> {
    const plugin = extensionPlugin(config, entries, browser, distPath ?? resolve(config.root, "dist"));
    let onBeforeCb: ((arg: { bundlerConfigs: unknown[] }) => void) | null = null;
    const api = {
      onBeforeCreateCompiler: (cb: (arg: { bundlerConfigs: unknown[] }) => void) => {
        onBeforeCb = cb;
      },
    };
    plugin.setup(api as never);
    const bundlerConfig = { plugins: [] as unknown[] };
    await onBeforeCb!({ bundlerConfigs: [bundlerConfig] });
    const postBuildPlugin = bundlerConfig.plugins[0] as { apply: (c: unknown) => void };
    let afterEmitFn: ((compilation: unknown) => void) | null = null;
    postBuildPlugin.apply({
      hooks: { afterEmit: { tap: (_: string, fn: (compilation: unknown) => void) => { afterEmitFn = fn; } } },
    });
    return afterEmitFn!;
  }

  function makeContentDir(contentSrc: string): string {
    const dir = resolve(testRoot, "app", "content");
    mkdirSync(dir, { recursive: true });
    const p = resolve(dir, "index.ts");
    writeFileSync(p, contentSrc, "utf-8");
    return p;
  }

  it("collects content JS and CSS from Map-based entrypoints", async () => {
    const distPath = resolve(testRoot, "dist");
    const scriptPath = makeContentDir("console.log('no shadow');");
    const config = createMockConfig(testRoot);
    config.manifest = { name: "MapEP", version: "1.0.0", manifest_version: 3 };
    const entries: EntryInfo[] = [{ name: "content", scriptPath, htmlPath: undefined }];
    const afterEmitFn = await getAfterEmitFn(config, entries);

    const entrypoints = new Map<string, { getFiles: () => string[] }>();
    entrypoints.set("content", {
      getFiles: () => ["content/index.js", "content/style.css"],
    });
    afterEmitFn({ entrypoints });

    const manifest = JSON.parse(readFileSync(resolve(distPath, "manifest.json"), "utf-8"));
    expect(manifest.content_scripts[0].js).toEqual(["content/index.js"]);
    expect(manifest.content_scripts[0].css).toEqual(["content/style.css"]);
  });

  it("collects content files from plain object entrypoints", async () => {
    const distPath = resolve(testRoot, "dist");
    const scriptPath = makeContentDir("console.log('obj');");
    const config = createMockConfig(testRoot);
    config.manifest = { name: "ObjEP", version: "1.0.0", manifest_version: 3 };
    const entries: EntryInfo[] = [{ name: "content", scriptPath, htmlPath: undefined }];
    const afterEmitFn = await getAfterEmitFn(config, entries);

    afterEmitFn({
      entrypoints: {
        content: { getFiles: () => ["content/main.js", "content/app.css"] },
      },
    });

    const manifest = JSON.parse(readFileSync(resolve(distPath, "manifest.json"), "utf-8"));
    expect(manifest.content_scripts[0].js).toBeDefined();
    expect(manifest.content_scripts[0].css).toEqual(["content/app.css"]);
  });

  it("falls back to asset names when entrypoint getFiles throws", async () => {
    const distPath = resolve(testRoot, "dist");
    const scriptPath = makeContentDir("console.log('throw');");
    const config = createMockConfig(testRoot);
    config.manifest = { name: "ThrowEP", version: "1.0.0", manifest_version: 3 };
    const entries: EntryInfo[] = [{ name: "content", scriptPath, htmlPath: undefined }];
    const afterEmitFn = await getAfterEmitFn(config, entries);

    const entrypoints = new Map();
    entrypoints.set("content", {
      getFiles: () => { throw new Error("broken"); },
    });
    afterEmitFn({
      entrypoints,
      assets: { "content/index.js": {}, "content/style.css": {} },
    });

    const manifest = JSON.parse(readFileSync(resolve(distPath, "manifest.json"), "utf-8"));
    expect(manifest.content_scripts[0].js).toEqual(["content/index.js"]);
    expect(manifest.content_scripts[0].css).toEqual(["content/style.css"]);
  });

  it("falls back to asset names when entrypoint getFiles returns empty", async () => {
    const distPath = resolve(testRoot, "dist");
    const scriptPath = makeContentDir("console.log('empty');");
    const config = createMockConfig(testRoot);
    config.manifest = { name: "EmptyEP", version: "1.0.0", manifest_version: 3 };
    const entries: EntryInfo[] = [{ name: "content", scriptPath, htmlPath: undefined }];
    const afterEmitFn = await getAfterEmitFn(config, entries);

    const entrypoints = new Map();
    entrypoints.set("content", { getFiles: () => [] });
    afterEmitFn({
      entrypoints,
      assets: { "content.js": {} },
    });

    const manifest = JSON.parse(readFileSync(resolve(distPath, "manifest.json"), "utf-8"));
    expect(manifest.content_scripts[0].js).toBeDefined();
  });

  it("uses byNames CSS when entrypoint JS has no CSS", async () => {
    const distPath = resolve(testRoot, "dist");
    const scriptPath = makeContentDir("console.log('merge');");
    const config = createMockConfig(testRoot);
    config.manifest = { name: "MergeCSS", version: "1.0.0", manifest_version: 3 };
    const entries: EntryInfo[] = [{ name: "content", scriptPath, htmlPath: undefined }];
    const afterEmitFn = await getAfterEmitFn(config, entries);

    const entrypoints = new Map();
    entrypoints.set("content", { getFiles: () => ["content/index.js"] });
    afterEmitFn({
      entrypoints,
      assets: { "content/index.js": {}, "content/style.css": {} },
    });

    const manifest = JSON.parse(readFileSync(resolve(distPath, "manifest.json"), "utf-8"));
    expect(manifest.content_scripts[0].js).toEqual(["content/index.js"]);
    expect(manifest.content_scripts[0].css).toEqual(["content/style.css"]);
  });

  it("falls back when entrypoint content entry has no getFiles function", async () => {
    const distPath = resolve(testRoot, "dist");
    const scriptPath = makeContentDir("console.log('noGetFiles');");
    const config = createMockConfig(testRoot);
    config.manifest = { name: "NoGF", version: "1.0.0", manifest_version: 3 };
    const entries: EntryInfo[] = [{ name: "content", scriptPath, htmlPath: undefined }];
    const afterEmitFn = await getAfterEmitFn(config, entries);

    const entrypoints = new Map();
    entrypoints.set("content", { someOther: true });
    afterEmitFn({
      entrypoints,
      assets: { "content/index.js": {} },
    });

    const manifest = JSON.parse(readFileSync(resolve(distPath, "manifest.json"), "utf-8"));
    expect(manifest.content_scripts[0].js).toEqual(["content/index.js"]);
  });

  it("collects content output from getAssets when no assets object exists", async () => {
    const distPath = resolve(testRoot, "dist");
    const scriptPath = makeContentDir("console.log('getAssets');");
    const config = createMockConfig(testRoot);
    config.manifest = { name: "GetAssets", version: "1.0.0", manifest_version: 3 };
    const entries: EntryInfo[] = [{ name: "content", scriptPath, htmlPath: undefined }];
    const afterEmitFn = await getAfterEmitFn(config, entries);

    afterEmitFn({
      getAssets: () => [
        { filename: "content/index.js" },
        { name: "content/style.css" },
      ],
    });

    const manifest = JSON.parse(readFileSync(resolve(distPath, "manifest.json"), "utf-8"));
    expect(manifest.content_scripts[0].js).toEqual(["content/index.js"]);
    expect(manifest.content_scripts[0].css).toEqual(["content/style.css"]);
  });

  it("returns no content output when getAssets throws and assets is empty", async () => {
    const distPath = resolve(testRoot, "dist");
    const scriptPath = makeContentDir("console.log('noAssets');");
    const config = createMockConfig(testRoot);
    config.manifest = { name: "NoAssets", version: "1.0.0", manifest_version: 3 };
    const entries: EntryInfo[] = [{ name: "content", scriptPath, htmlPath: undefined }];
    const afterEmitFn = await getAfterEmitFn(config, entries);

    afterEmitFn({
      getAssets: () => { throw new Error("fail"); },
    });

    const manifest = JSON.parse(readFileSync(resolve(distPath, "manifest.json"), "utf-8"));
    const cs = manifest.content_scripts?.[0];
    expect(cs?.css).toBeUndefined();
  });

  it("disables CSS auto-fill when content uses wrapper shadow syntax", async () => {
    const distPath = resolve(testRoot, "dist");
    const scriptPath = makeContentDir("export default { wrapper: 'shadow', target: 'body' };");
    const config = createMockConfig(testRoot);
    config.manifest = { name: "WrapShadow", version: "1.0.0", manifest_version: 3 };
    const entries: EntryInfo[] = [{ name: "content", scriptPath, htmlPath: undefined }];
    const afterEmitFn = await getAfterEmitFn(config, entries);

    afterEmitFn({
      assets: { "content/index.js": {}, "content/style.css": {} },
    });

    const manifest = JSON.parse(readFileSync(resolve(distPath, "manifest.json"), "utf-8"));
    expect(manifest.content_scripts[0].css).toBeUndefined();
  });

  it("disables CSS auto-fill when content uses defineIframeContentUI", async () => {
    const distPath = resolve(testRoot, "dist");
    const scriptPath = makeContentDir(
      "import { defineIframeContentUI } from '@addfox/utils';\ndefineIframeContentUI({});\n"
    );
    const config = createMockConfig(testRoot);
    config.manifest = { name: "IframeUI", version: "1.0.0", manifest_version: 3 };
    const entries: EntryInfo[] = [{ name: "content", scriptPath, htmlPath: undefined }];
    const afterEmitFn = await getAfterEmitFn(config, entries);

    afterEmitFn({
      assets: { "content/index.js": {}, "content/style.css": {} },
    });

    const manifest = JSON.parse(readFileSync(resolve(distPath, "manifest.json"), "utf-8"));
    expect(manifest.content_scripts[0].css).toBeUndefined();
  });

  it("enables CSS auto-fill when content scriptPath does not exist", async () => {
    const distPath = resolve(testRoot, "dist");
    const scriptPath = resolve(testRoot, "app", "content", "nonexistent.ts");
    const config = createMockConfig(testRoot);
    config.manifest = { name: "NoFile", version: "1.0.0", manifest_version: 3 };
    const entries: EntryInfo[] = [{ name: "content", scriptPath, htmlPath: undefined }];
    const afterEmitFn = await getAfterEmitFn(config, entries);

    afterEmitFn({
      assets: { "content/index.js": {}, "content/style.css": {} },
    });

    const manifest = JSON.parse(readFileSync(resolve(distPath, "manifest.json"), "utf-8"));
    expect(manifest.content_scripts[0].css).toEqual(["content/style.css"]);
  });

  it("preserves CSS when user defines css in manifest content_scripts", async () => {
    const distPath = resolve(testRoot, "dist");
    const scriptPath = makeContentDir(
      "import { defineShadowContentUI } from '@addfox/utils';\ndefineShadowContentUI({});\n"
    );
    const config = createMockConfig(testRoot);
    config.manifest = {
      name: "UserCSS",
      version: "1.0.0",
      manifest_version: 3,
      content_scripts: [{ matches: ["<all_urls>"], css: ["custom.css"] }],
    } as never;
    const entries: EntryInfo[] = [{ name: "content", scriptPath, htmlPath: undefined }];
    const afterEmitFn = await getAfterEmitFn(config, entries);

    afterEmitFn({
      assets: { "content/index.js": {}, "content/style.css": {} },
    });

    const manifest = JSON.parse(readFileSync(resolve(distPath, "manifest.json"), "utf-8"));
    const cs = manifest.content_scripts?.[0];
    expect(cs.css).toBeDefined();
  });

  it("uses fallback branch in pickManifestBranch when selected browser is missing", async () => {
    const distPath = resolve(testRoot, "dist");
    const scriptPath = makeContentDir(
      "import { defineShadowContentUI } from 'x';\ndefineShadowContentUI({});\n"
    );
    const config = createMockConfig(testRoot);
    config.manifest = {
      firefox: {
        name: "F", version: "1.0.0", manifest_version: 3,
        content_scripts: [{ matches: ["<all_urls>"], css: ["user.css"] }],
      },
    } as never;
    const entries: EntryInfo[] = [{ name: "content", scriptPath, htmlPath: undefined }];

    const origWarn = console.warn;
    console.warn = () => {};
    const afterEmitFn = await getAfterEmitFn(config, entries, "chromium");
    afterEmitFn({
      assets: { "content/index.js": {}, "content/style.css": {} },
    });
    console.warn = origWarn;

    const manifest = JSON.parse(readFileSync(resolve(distPath, "manifest.json"), "utf-8"));
    const cs = manifest.content_scripts?.[0];
    expect(cs?.css).toBeDefined();
  });

  it("picks selected branch in pickManifestBranch for matching browser", async () => {
    const distPath = resolve(testRoot, "dist");
    const scriptPath = makeContentDir(
      "import { defineShadowContentUI } from 'x';\ndefineShadowContentUI({});\n"
    );
    const config = createMockConfig(testRoot);
    config.manifest = {
      chromium: {
        name: "C", version: "1.0.0", manifest_version: 3,
        content_scripts: [{ matches: ["<all_urls>"], css: ["c.css"] }],
      },
      firefox: { name: "F", version: "1.0.0", manifest_version: 3 },
    } as never;
    const entries: EntryInfo[] = [{ name: "content", scriptPath, htmlPath: undefined }];
    const afterEmitFn = await getAfterEmitFn(config, entries, "chromium");

    afterEmitFn({
      assets: { "content/index.js": {}, "content/style.css": {} },
    });

    const manifest = JSON.parse(readFileSync(resolve(distPath, "manifest.json"), "utf-8"));
    const cs = manifest.content_scripts?.[0];
    expect(cs?.css).toBeDefined();
  });

  it("injects CSS runtime meta banner into content JS files", async () => {
    const distPath = resolve(testRoot, "dist");
    mkdirSync(resolve(distPath, "content"), { recursive: true });
    const scriptPath = makeContentDir("console.log('inject');");
    writeFileSync(resolve(distPath, "content", "index.js"), "console.log('original');", "utf-8");
    writeFileSync(resolve(distPath, "content", "style.css"), ".body{color:red}", "utf-8");

    const config = createMockConfig(testRoot);
    config.manifest = { name: "Inject", version: "1.0.0", manifest_version: 3 };
    const entries: EntryInfo[] = [{ name: "content", scriptPath, htmlPath: undefined }];
    const afterEmitFn = await getAfterEmitFn(config, entries);

    afterEmitFn({
      assets: { "content/index.js": {}, "content/style.css": {} },
    });

    const jsContent = readFileSync(resolve(distPath, "content", "index.js"), "utf-8");
    expect(jsContent).toContain("__ADDFOX_CONTENT_CSS_FILES__");
    expect(jsContent).toContain("__ADDFOX_CONTENT_CSS_TEXTS__");
    expect(jsContent).toContain(".body{color:red}");
    expect(jsContent).toContain("console.log('original')");
  });

  it("skips CSS banner injection when JS already has the banner", async () => {
    const distPath = resolve(testRoot, "dist");
    mkdirSync(resolve(distPath, "content"), { recursive: true });
    const scriptPath = makeContentDir("console.log('skip');");
    const existingBanner =
      `;globalThis.__ADDFOX_CONTENT_CSS_FILES__=["content/style.css"];` +
      `globalThis.__ADDFOX_CONTENT_CSS_TEXTS__=[".x{color:blue}"];\n`;
    writeFileSync(resolve(distPath, "content", "index.js"), existingBanner + "console.log('code');", "utf-8");
    writeFileSync(resolve(distPath, "content", "style.css"), ".x{color:blue}", "utf-8");

    const config = createMockConfig(testRoot);
    config.manifest = { name: "Skip", version: "1.0.0", manifest_version: 3 };
    const entries: EntryInfo[] = [{ name: "content", scriptPath, htmlPath: undefined }];
    const afterEmitFn = await getAfterEmitFn(config, entries);

    afterEmitFn({
      assets: { "content/index.js": {}, "content/style.css": {} },
    });

    const jsContent = readFileSync(resolve(distPath, "content", "index.js"), "utf-8");
    const bannerCount = (jsContent.match(/__ADDFOX_CONTENT_CSS_FILES__/g) || []).length;
    expect(bannerCount).toBe(1);
  });

  it("skips banner injection when content JS file does not exist on disk", async () => {
    const distPath = resolve(testRoot, "dist");
    mkdirSync(resolve(distPath, "content"), { recursive: true });
    const scriptPath = makeContentDir("console.log('nojsfile');");
    writeFileSync(resolve(distPath, "content", "style.css"), ".x{}", "utf-8");

    const config = createMockConfig(testRoot);
    config.manifest = { name: "NoJSFile", version: "1.0.0", manifest_version: 3 };
    const entries: EntryInfo[] = [{ name: "content", scriptPath, htmlPath: undefined }];
    const afterEmitFn = await getAfterEmitFn(config, entries);

    afterEmitFn({
      assets: { "content/index.js": {}, "content/style.css": {} },
    });

    expect(existsSync(resolve(distPath, "content", "index.js"))).toBe(false);
  });

  it("reads CSS asset returning empty string when CSS file is missing", async () => {
    const distPath = resolve(testRoot, "dist");
    mkdirSync(resolve(distPath, "content"), { recursive: true });
    const scriptPath = makeContentDir("console.log('missingcss');");
    writeFileSync(resolve(distPath, "content", "index.js"), "console.log('code');", "utf-8");

    const config = createMockConfig(testRoot);
    config.manifest = { name: "MissingCSS", version: "1.0.0", manifest_version: 3 };
    const entries: EntryInfo[] = [{ name: "content", scriptPath, htmlPath: undefined }];
    const afterEmitFn = await getAfterEmitFn(config, entries);

    afterEmitFn({
      assets: { "content/index.js": {}, "content/missing.css": {} },
    });

    const jsContent = readFileSync(resolve(distPath, "content", "index.js"), "utf-8");
    expect(jsContent).toContain('__ADDFOX_CONTENT_CSS_TEXTS__=[""]');
  });

  it("validates MV2 manifest correctly", async () => {
    const distPath = resolve(testRoot, "dist");
    const config = createMockConfig(testRoot);
    config.manifest = { name: "MV2", version: "1.0.0", manifest_version: 2 };
    const entries: EntryInfo[] = [
      { name: "background", scriptPath: "/app/bg.ts", htmlPath: undefined, html: true } as EntryInfo,
    ];
    const afterEmitFn = await getAfterEmitFn(config, entries);
    afterEmitFn({});

    const manifest = JSON.parse(readFileSync(resolve(distPath, "manifest.json"), "utf-8"));
    expect(manifest.manifest_version).toBe(2);
  });

  it("handles missing manifest_version gracefully", async () => {
    const distPath = resolve(testRoot, "dist");
    const config = createMockConfig(testRoot);
    config.manifest = { name: "NoMV", version: "1.0.0" } as never;
    const entries = createMockEntries();
    const afterEmitFn = await getAfterEmitFn(config, entries);
    afterEmitFn({});

    const manifest = JSON.parse(readFileSync(resolve(distPath, "manifest.json"), "utf-8"));
    expect(manifest.manifest_version).toBeUndefined();
  });

  it("collects content.css as CSS via content-prefix matching", async () => {
    const distPath = resolve(testRoot, "dist");
    const scriptPath = makeContentDir("console.log('contentCss');");
    const config = createMockConfig(testRoot);
    config.manifest = { name: "ContentCSS", version: "1.0.0", manifest_version: 3 };
    const entries: EntryInfo[] = [{ name: "content", scriptPath, htmlPath: undefined }];
    const afterEmitFn = await getAfterEmitFn(config, entries);

    afterEmitFn({
      assets: { "content.js": {}, "content.css": {} },
    });

    const manifest = JSON.parse(readFileSync(resolve(distPath, "manifest.json"), "utf-8"));
    expect(manifest.content_scripts[0].js).toBeDefined();
    expect(manifest.content_scripts[0].css).toEqual(["content.css"]);
  });

  it("writes '- None' entries section when entries is empty", async () => {
    const distPath = resolve(testRoot, "dist");
    const config = createMockConfig(testRoot);
    config.manifest = { name: "NoEntries", version: "1.0.0", manifest_version: 3 };
    const afterEmitFn = await getAfterEmitFn(config, []);

    afterEmitFn({});

    const metaPath = resolve(testRoot, "meta.md");
    const meta = await waitForFileContains(metaPath, "## 3. Entries");
    expect(meta).toContain("## 3. Entries");
    expect(meta).toContain("- None");
  });

  it("formats multi-entry tree with blank separator and html output", async () => {
    const distPath = resolve(testRoot, "dist");
    const config = createMockConfig(testRoot);
    config.manifest = { name: "MultiEntries", version: "1.0.0", manifest_version: 3 };
    const entries: EntryInfo[] = [
      { name: "popup", scriptPath: "/app/popup/index.ts", htmlPath: "/app/popup/index.html" } as EntryInfo,
      { name: "background", scriptPath: "/app/background/index.ts", htmlPath: undefined } as EntryInfo,
    ];
    const afterEmitFn = await getAfterEmitFn(config, entries);

    const entrypoints = new Map<string, { getFiles: () => string[] }>();
    entrypoints.set("popup", { getFiles: () => ["popup/index.js", "popup/index.html"] });
    entrypoints.set("background", { getFiles: () => ["background/index.js"] });
    afterEmitFn({ entrypoints });

    const meta = await waitForFileContains(resolve(testRoot, "meta.md"), "popup/");
    expect(meta).toContain("📄 HTML: /app/popup/index.html");
    expect(meta).toContain("popup/\n");
    expect(meta).toContain("\n\nbackground/\n");
  });

  it("handles unknown entrypoints shape and filters non-string permissions in meta", async () => {
    const distPath = resolve(testRoot, "dist");
    const config = createMockConfig(testRoot);
    config.manifest = {
      name: "UnknownEntrypoints",
      version: "1.0.0",
      manifest_version: 3,
      permissions: ["storage", 1, null, "tabs"],
    } as never;
    const entries: EntryInfo[] = [
      { name: "popup", scriptPath: "/app/popup/index.ts", htmlPath: "/app/popup/index.html" } as EntryInfo,
    ];
    const afterEmitFn = await getAfterEmitFn(config, entries);

    afterEmitFn({
      entrypoints: 42,
      assets: { "popup/index.js": {}, "popup/index.html": {} },
    });

    const meta = await waitForFileContains(resolve(testRoot, "meta.md"), "### 2.1 Permissions");
    expect(meta).toContain("- storage");
    expect(meta).toContain("- tabs");
    expect(meta).not.toContain("- 1");
    expect(meta).not.toContain("- null");
  });
});
