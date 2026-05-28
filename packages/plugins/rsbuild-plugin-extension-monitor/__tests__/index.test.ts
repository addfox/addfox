import { describe, expect, it } from "@rstest/core";
import type { AddfoxResolvedConfig, EntryInfo } from "@addfox/core";
import { monitorPlugin } from "../src/index.ts";

function minimalConfig(manifest: AddfoxResolvedConfig["manifest"]): AddfoxResolvedConfig {
  return { manifest, appDir: "/app", outDir: "/out" } as AddfoxResolvedConfig;
}

function minimalEntry(name: string): EntryInfo {
  return { name, scriptPath: `/${name}.ts`, htmlPath: `/${name}.html`, html: true };
}

function decodeDataModule(value: string): string {
  return decodeURIComponent(value.slice("data:text/javascript,".length));
}

describe("plugin-extension-monitor", () => {
  it("monitorPlugin returns plugin with name rsbuild-plugin-extension-monitor", () => {
    const config = minimalConfig({ name: "X", version: "1.0.0", manifest_version: 3 });
    const plugin = monitorPlugin(config, [minimalEntry("popup")]);
    expect(plugin.name).toBe("rsbuild-plugin-extension-monitor");
    expect(plugin.setup).toBeDefined();
    expect(typeof plugin.setup).toBe("function");
  });

  it("monitorPlugin setup runs without error", () => {
    const config = minimalConfig({ name: "X", version: "1.0.0", manifest_version: 3 });
    const plugin = monitorPlugin(config, [minimalEntry("popup")]);
    const api = {
      modifyRsbuildConfig: (fn: (c: unknown) => void) => fn({ source: { entry: {} } }),
      onBeforeCreateCompiler: () => {},
    };
    expect(() => plugin.setup!(api as never)).not.toThrow();
  });

  it("modifyRsbuildConfig injects data:text/javascript snippet for each entry", () => {
    const config = minimalConfig({ name: "X", version: "1.0.0", manifest_version: 3 });
    const plugin = monitorPlugin(config, [minimalEntry("background"), minimalEntry("content")]);
    const cfg: {
      source: {
        entry: Record<string, string>;
      };
    } = {
      source: {
        entry: {
          background: "/app/background.ts",
          content: "/app/content.ts",
        },
      },
    };
    const api = {
      modifyRsbuildConfig: (fn: (c: unknown) => void) => {
        fn(cfg);
        const src = (cfg as Record<string, unknown>).source as Record<string, unknown>;
        const entry = src.entry as Record<string, { import: string[]; html: boolean }>;
        
        // Check background entry
        expect(entry.background.import.length).toBe(2);
        expect(entry.background.import[0]).toContain("data:text/javascript");
        const backgroundSnippet = decodeDataModule(entry.background.import[0]);
        expect(backgroundSnippet).toContain("setupAddfoxMonitor");
        expect(backgroundSnippet).toContain("startHmrReloadClient");
        expect(entry.background.import[1]).toBe("/app/background.ts");
        expect(entry.background.html).toBe(false);
        
        // Check content entry
        expect(entry.content.import.length).toBe(2);
        expect(entry.content.import[0]).toContain("data:text/javascript");
        const contentSnippet = decodeDataModule(entry.content.import[0]);
        expect(contentSnippet).toContain("setupAddfoxMonitor");
        expect(entry.content.import[1]).toBe("/app/content.ts");
        expect(entry.content.html).toBe(false);
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup!(api as never);
  });

  it("Firefox dev does not inject startHmrReloadClient (reload manager handles reload)", () => {
    const config = minimalConfig({ name: "X", version: "1.0.0", manifest_version: 3 });
    const plugin = monitorPlugin(config, [minimalEntry("background")], "firefox");
    const cfg: {
      source: {
        entry: Record<string, string>;
      };
    } = {
      source: {
        entry: {
          background: "/app/background.ts",
        },
      },
    };
    const api = {
      modifyRsbuildConfig: (fn: (c: unknown) => void) => {
        fn(cfg);
        const src = (cfg as Record<string, unknown>).source as Record<string, unknown>;
        const entry = src.entry as Record<string, { import: string[]; html: boolean }>;
        const snippet = decodeDataModule(entry.background.import[0]);
        expect(snippet).toContain("setupAddfoxMonitor");
        expect(snippet).not.toContain("startHmrReloadClient");
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup!(api as never);
  });

  it("modifyRsbuildConfig prepends to existing import array", () => {
    const config = minimalConfig({ name: "X", version: "1.0.0", manifest_version: 3 });
    const plugin = monitorPlugin(config, [minimalEntry("popup")]);
    const cfg: {
      source: {
        entry: Record<string, { import: string[] }>;
      };
    } = {
      source: {
        entry: {
          popup: { import: ["/app/popup.ts"] },
        },
      },
    };
    const api = {
      modifyRsbuildConfig: (fn: (c: unknown) => void) => {
        fn(cfg);
        const src = (cfg as Record<string, unknown>).source as Record<string, unknown>;
        const entry = src.entry as Record<string, { import: string[] }>;
        
        expect(entry.popup.import.length).toBe(2);
        expect(entry.popup.import[0]).toContain("data:text/javascript");
        expect(entry.popup.import[1]).toBe("/app/popup.ts");
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup!(api as never);
  });

  it("modifyRsbuildConfig skips entries not in namesToInject", () => {
    const config = minimalConfig({ name: "X", version: "1.0.0", manifest_version: 3 });
    const plugin = monitorPlugin(config, [minimalEntry("background")]);
    const cfg: {
      source: {
        entry: Record<string, unknown>;
      };
    } = {
      source: {
        entry: {
          background: "/app/background.ts",
          popup: { import: "/app/popup.ts" },
        },
      },
    };
    const api = {
      modifyRsbuildConfig: (fn: (c: unknown) => void) => {
        fn(cfg);
        const src = (cfg as Record<string, unknown>).source as Record<string, unknown>;
        const entry = src.entry as Record<string, unknown>;
        // background is injected
        const bg = entry.background as { import: string[] };
        expect(decodeDataModule(bg.import[0])).toContain("setupAddfoxMonitor");
        // popup is not in namesToInject — should be left as-is
        expect(entry.popup).toEqual({ import: "/app/popup.ts" });
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup!(api as never);
  });

  it("modifyRsbuildConfig handles string import property", () => {
    const config = minimalConfig({ name: "X", version: "1.0.0", manifest_version: 3 });
    const plugin = monitorPlugin(config, [minimalEntry("popup")]);
    const cfg: {
      source: {
        entry: Record<string, unknown>;
      };
    } = {
      source: {
        entry: {
          popup: { import: "/app/popup.ts" },
        },
      },
    };
    const api = {
      modifyRsbuildConfig: (fn: (c: unknown) => void) => {
        fn(cfg);
        const src = (cfg as Record<string, unknown>).source as Record<string, unknown>;
        const entry = src.entry as Record<string, { import: string[] }>;
        // popup has string import — should be wrapped with snippet
        const snippet = decodeDataModule(entry.popup.import[0]);
        expect(snippet).toContain("setupAddfoxMonitor");
        expect(entry.popup.import[1]).toBe("/app/popup.ts");
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup!(api as never);
  });

  it("hotReload false does not inject startHmrReloadClient for any browser", () => {
    const config = minimalConfig({ name: "X", version: "1.0.0", manifest_version: 3 });
    (config as Record<string, unknown>).hotReload = false;
    const plugin = monitorPlugin(config, [minimalEntry("background")], "firefox");
    const cfg: {
      source: {
        entry: Record<string, string>;
      };
    } = {
      source: {
        entry: {
          background: "/app/background.ts",
        },
      },
    };
    const api = {
      modifyRsbuildConfig: (fn: (c: unknown) => void) => {
        fn(cfg);
        const src = (cfg as Record<string, unknown>).source as Record<string, unknown>;
        const entry = src.entry as Record<string, { import: string[]; html: boolean }>;
        const snippet = decodeDataModule(entry.background.import[0]);
        expect(snippet).toContain("setupAddfoxMonitor");
        expect(snippet).not.toContain("startHmrReloadClient");
      },
      onBeforeCreateCompiler: () => {},
    };
    plugin.setup!(api as never);
  });

  it("should have enforce: 'post' to ensure it runs after entryPlugin", () => {
    const config = minimalConfig({ name: "X", version: "1.0.0", manifest_version: 3 });
    const plugin = monitorPlugin(config, [minimalEntry("background")]);
    
    // Verify enforce is set to "post" to ensure correct plugin execution order
    expect(plugin.enforce).toBe("post");
  });

  it("should handle entry when entryPlugin sets it first (simulating execution order)", () => {
    const config = minimalConfig({ name: "X", version: "1.0.0", manifest_version: 3 });
    const plugin = monitorPlugin(config, [minimalEntry("background"), minimalEntry("popup")]);
    
    // Simulate config before entryPlugin runs
    const initialConfig: {
      source?: { entry?: Record<string, string> };
    } = {};
    
    // Simulate entryPlugin adding entries first
    const configAfterEntryPlugin = {
      source: {
        entry: {
          background: "/app/background.ts",
          popup: "/app/popup.ts",
        },
      },
    };
    
    const api = {
      modifyRsbuildConfig: (fn: (c: unknown) => void) => {
        // Run with config after entryPlugin has modified it
        fn(configAfterEntryPlugin);
        
        // Verify monitorPlugin successfully injected snippets
        const src = (configAfterEntryPlugin as Record<string, unknown>).source as Record<string, unknown>;
        const entry = src.entry as Record<string, { import: string[]; html?: boolean }>;
        
        // Should have injected data:text/javascript snippet for both entries
        expect(entry.background.import).toBeDefined();
        expect(Array.isArray(entry.background.import)).toBe(true);
        expect(entry.background.import[0]).toContain("data:text/javascript");
        expect(decodeDataModule(entry.background.import[0])).toContain("setupAddfoxMonitor");
        
        expect(entry.popup.import).toBeDefined();
        expect(Array.isArray(entry.popup.import)).toBe(true);
        expect(entry.popup.import[0]).toContain("data:text/javascript");
        expect(decodeDataModule(entry.popup.import[0])).toContain("setupAddfoxMonitor");
      },
      onBeforeCreateCompiler: () => {},
    };
    
    plugin.setup!(api as never);
  });
});
