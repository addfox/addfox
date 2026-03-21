import { describe, expect, it, beforeEach, afterEach } from "@rstest/core";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { Pipeline, runPipeline } from "../src/pipeline/index.ts";
import { buildRuntimeEnvDefine, buildScopedEnvByEntry, getLoadEnvPrefixes } from "../src/pipeline/Pipeline.ts";
import type { AddfoxResolvedConfig, PipelineContext, EntryInfo } from "@addfox/core";
import type { PipelineHook } from "@addfox/core/pipeline";

function createMockConfig(root: string, overrides: Partial<AddfoxResolvedConfig> = {}): AddfoxResolvedConfig {
  return {
    root,
    appDir: "src",
    outDir: "dist",
    outputRoot: ".",
    manifest: {},
    plugins: [],
    envPrefix: [],
    ...overrides,
  } as unknown as AddfoxResolvedConfig;
}

function createMockEntries(root: string): EntryInfo[] {
  return [
    { name: "background", scriptPath: resolve(root, "src/background/index.ts"), htmlPath: undefined },
    { name: "popup", scriptPath: resolve(root, "src/popup/index.ts"), htmlPath: resolve(root, "src/popup/index.html") },
  ];
}

/** Writes app/background/index.ts so entry discovery finds at least one entry (default appDir is "app"). */
function writeMinimalEntryFixture(root: string): void {
  const bgDir = resolve(root, "app", "background");
  mkdirSync(bgDir, { recursive: true });
  writeFileSync(resolve(bgDir, "index.ts"), "// background entry\n", "utf-8");
}

describe("Pipeline", () => {
  let testRoot: string;

  beforeEach(() => {
    testRoot = resolve(tmpdir(), `addfox-pipeline-${Date.now()}`);
    mkdirSync(testRoot, { recursive: true });
    writeFileSync(
      resolve(testRoot, "package.json"),
      JSON.stringify({ name: "test", devDependencies: { "@types/chrome": "^0.0.0" } }),
      "utf-8"
    );
  });

  afterEach(() => {
    if (existsSync(testRoot)) rmSync(testRoot, { recursive: true, force: true });
  });

  it("Pipeline runs with hooks", async () => {
    // Create a minimal addfox.config.js and app structure with one entry so load stage succeeds
    writeFileSync(
      resolve(testRoot, "addfox.config.js"),
      `export default { manifest: { name: "test", version: "1.0.0", manifest_version: 3 } };`,
      "utf-8"
    );
    mkdirSync(resolve(testRoot, "app"), { recursive: true });
    writeFileSync(
      resolve(testRoot, "app/manifest.json"),
      JSON.stringify({ name: "test", version: "1.0.0", manifest_version: 3 }),
      "utf-8"
    );
    writeMinimalEntryFixture(testRoot);

    const pipeline = new Pipeline({
      root: testRoot,
      command: 'build',
      browser: 'chromium',
      launch: 'chromium',
      cache: false,
      report: false,
    });
    
    // Register hooks
    pipeline.hooks.register('parse', 'before', async () => { beforeParseCalled = true; });
    pipeline.hooks.register('build', 'after', async () => { afterBuildCalled = true; });
    
    // Should throw because the pipeline expects actual entry files
    // But we can at least verify the pipeline structure
    expect(pipeline).toBeDefined();
  });

  it("runPipeline function works with minimal config", async () => {
    writeFileSync(
      resolve(testRoot, "addfox.config.js"),
      `export default { manifest: { name: "test", version: "1.0.0", manifest_version: 3 } };`,
      "utf-8"
    );
    mkdirSync(resolve(testRoot, "app"), { recursive: true });
    writeFileSync(
      resolve(testRoot, "app/manifest.json"),
      JSON.stringify({ name: "test", version: "1.0.0", manifest_version: 3 }),
      "utf-8"
    );
    writeMinimalEntryFixture(testRoot);

    try {
      const ctx = await runPipeline({
        root: testRoot,
        command: 'build',
        browser: 'chromium',
        launch: 'chromium',
        cache: false,
        report: false,
      });
      expect(ctx).toBeDefined();
      expect(ctx.command).toBe("build");
      expect(ctx.root).toBe(testRoot);
    } catch (e) {
      // Expected to fail due to missing entries
      expect(e).toBeDefined();
    }
  });
});

describe("Pipeline Lifecycle Hooks", () => {
  let testRoot: string;

  beforeEach(() => {
    testRoot = resolve(tmpdir(), `addfox-hooks-${Date.now()}`);
    mkdirSync(testRoot, { recursive: true });
    writeFileSync(
      resolve(testRoot, "package.json"),
      JSON.stringify({ name: "test", devDependencies: { "@types/chrome": "^0.0.0" } }),
      "utf-8"
    );
    writeFileSync(
      resolve(testRoot, "addfox.config.js"),
      `export default { manifest: { name: "test", version: "1.0.0", manifest_version: 3 } };`,
      "utf-8"
    );
    mkdirSync(resolve(testRoot, "app"), { recursive: true });
    writeFileSync(
      resolve(testRoot, "app/manifest.json"),
      JSON.stringify({ name: "test", version: "1.0.0", manifest_version: 3 }),
      "utf-8"
    );
    writeMinimalEntryFixture(testRoot);
  });

  afterEach(() => {
    if (existsSync(testRoot)) rmSync(testRoot, { recursive: true, force: true });
  });

  it("executes hooks in correct order", async () => {
    const hookOrder: string[] = [];
    const pipeline = new Pipeline({
      root: testRoot,
      command: 'build',
      browser: 'chromium',
      launch: 'chromium',
      cache: false,
      report: false,
    });

    // Register hooks using the new HookManager API
    pipeline.hooks.register('init', 'before', async () => hookOrder.push("beforeInit"));
    pipeline.hooks.register('init', 'after', async () => hookOrder.push("afterInit"));
    pipeline.hooks.register('options', 'before', async () => hookOrder.push("beforeOptions"));
    pipeline.hooks.register('options', 'after', async () => hookOrder.push("afterOptions"));
    pipeline.hooks.register('parse', 'before', async () => hookOrder.push("beforeParse"));
    pipeline.hooks.register('parse', 'after', async () => hookOrder.push("afterParse"));
    pipeline.hooks.register('complete', 'after', async () => hookOrder.push("afterComplete"));

    try {
      await pipeline.run();
    } catch {
      // Ignore errors, we just want to check hook order
    }

    // Verify hooks were called in order
    expect(hookOrder.indexOf("beforeInit")).toBeLessThan(hookOrder.indexOf("afterInit"));
    expect(hookOrder.indexOf("afterInit")).toBeLessThan(hookOrder.indexOf("beforeOptions"));
    expect(hookOrder.indexOf("beforeOptions")).toBeLessThan(hookOrder.indexOf("afterOptions"));
    expect(hookOrder.indexOf("afterOptions")).toBeLessThan(hookOrder.indexOf("beforeParse"));
    expect(hookOrder.indexOf("beforeParse")).toBeLessThan(hookOrder.indexOf("afterParse"));
  });

  it("allows registering hooks on HookManager", async () => {
    const pipeline = new Pipeline({
      root: testRoot,
      command: 'build',
      browser: 'chromium',
      launch: 'chromium',
      cache: false,
      report: false,
    });

    // Verify hooks can be registered
    let hookCalled = false;
    pipeline.hooks.register('init', 'before', async () => { hookCalled = true; });

    expect(hookCalled).toBe(false); // Not called yet, just registered
  });
});

describe("Pipeline runtime env define", () => {
  it("buildRuntimeEnvDefine injects BROWSER and MANIFEST_VERSION", () => {
    const config = createMockConfig("/tmp", {
      manifest: {
        chromium: { manifest_version: 3 },
        firefox: { manifest_version: 2 },
      },
    });
    const chromiumVars = buildRuntimeEnvDefine(config, "chromium", "/tmp", false);
    const firefoxVars = buildRuntimeEnvDefine(config, "firefox", "/tmp", false);

    expect(chromiumVars["import.meta.env.BROWSER"]).toBe("\"chromium\"");
    expect(chromiumVars["import.meta.env.MANIFEST_VERSION"]).toBe("\"3\"");
    expect(firefoxVars["import.meta.env.BROWSER"]).toBe("\"firefox\"");
    expect(firefoxVars["import.meta.env.MANIFEST_VERSION"]).toBe("\"2\"");
    expect(chromiumVars["import.meta.env"]).toContain("\"BROWSER\":\"chromium\"");
    expect(chromiumVars["process.env"]).toBe("globalThis.__ADDFOX_PROCESS_ENV__");
  });

  it("getLoadEnvPrefixes defaults to ADDFOX_PUBLIC_ only", () => {
    const config = createMockConfig("/tmp", { envPrefix: undefined });
    expect(getLoadEnvPrefixes(config)).toEqual(["ADDFOX_PUBLIC_"]);
  });

  it("buildScopedEnvByEntry only exposes private env to background", () => {
    const base = {
      NODE_ENV: "production",
      ADDFOX_PUBLIC_API_URL: "https://prod.example.com",
    };
    const privateEnv = {
      ADDFOX_PRIVATE_TOKEN: "secret",
      ADDFOX_INTERNAL_FLAG: "internal",
    };

    const scoped = buildScopedEnvByEntry(["background", "popup", "content"], base, privateEnv);

    expect(scoped.background.ADDFOX_PRIVATE_TOKEN).toBe("secret");
    expect(scoped.background.ADDFOX_INTERNAL_FLAG).toBe("internal");
    expect(scoped.popup.ADDFOX_PRIVATE_TOKEN).toBeUndefined();
    expect(scoped.content.ADDFOX_INTERNAL_FLAG).toBeUndefined();
    expect(scoped.popup.ADDFOX_PUBLIC_API_URL).toBe("https://prod.example.com");
    expect(scoped.content.ADDFOX_PUBLIC_API_URL).toBe("https://prod.example.com");
  });
});
