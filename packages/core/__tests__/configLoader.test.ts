import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "@rstest/core";
import {
  loadConfigFile,
  resolveAddfoxConfig,
  getResolvedConfigFilePath,
  clearConfigCache,
} from "../src/config/loader.ts";
import { AddfoxError, ADDFOX_ERROR_CODES } from "@addfox/common";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, "fixtures", "config-loader");
const minimalFixtureDir = path.join(__dirname, "fixtures", "config-loader-minimal");
const modExportsFixtureDir = path.join(__dirname, "fixtures", "config-loader-mod-exports");
const emptyDir = path.join(__dirname, "fixtures");

describe("ConfigLoader", () => {
  describe("loadConfigFile", () => {
    it("returns null when no config file exists", () => {
      const result = loadConfigFile(emptyDir);
      expect(result).toBeNull();
    });

    it("loads addfox.config.js and returns user config", () => {
      const result = loadConfigFile(fixtureDir);
      expect(result).not.toBeNull();
      expect(result?.manifest?.name).toBe("Fixture");
      expect(result?.appDir).toBe("src");
    });

    it("loads addfox.config.js with module.exports (no default) and returns config", () => {
      const result = loadConfigFile(modExportsFixtureDir);
      expect(result).not.toBeNull();
      expect(result?.manifest?.name).toBe("ModExports");
      expect(result?.appDir).toBe("src");
    });
  });

  describe("resolve", () => {
    it("throws when no config file exists", () => {
      expect(() => resolveAddfoxConfig(emptyDir)).toThrow();
      try {
        resolveAddfoxConfig(emptyDir);
      } catch (e) {
        expect((e as AddfoxError).code).toBe(ADDFOX_ERROR_CODES.CONFIG_NOT_FOUND);
      }
    });

    it("returns config, baseEntries, entries when config and entries exist", () => {
      const { config, baseEntries, entries } = resolveAddfoxConfig(fixtureDir);
      expect(config.root).toBe(fixtureDir);
      expect(config.appDir).toMatch(/config-loader[\\/]src$/);
      expect(config.outDir).toBe("extension");
      expect(config.outputRoot).toBe(".addfox");
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.map((e) => e.name)).toContain("background");
    });

    it("uses default appDir and outDir when not set in config", () => {
      const { config, entries } = resolveAddfoxConfig(minimalFixtureDir);
      expect(config.appDir).toBe(path.join(minimalFixtureDir, "app"));
      expect(config.outDir).toBe("extension");
      expect(config.envPrefix).toEqual(["ADDFOX_PUBLIC_"]);
      expect(entries.some((e) => e.name === "background")).toBe(true);
    });

    it("returns empty baseEntries and entries when entry is false", () => {
      const entryDisabledDir = path.join(__dirname, "fixtures", "config-entry-disabled");
      const { config, baseEntries, entries } = resolveAddfoxConfig(entryDisabledDir);
      expect(config.entry).toBe(false);
      expect(config.manifest?.name).toBe("EntryDisabled");
      expect(baseEntries).toEqual([]);
      expect(entries).toEqual([]);
    });
  });
});

describe("resolveAddfoxConfig with invalid config", () => {
  it("throws when manifest is missing", () => {
    const noManifestDir = path.join(__dirname, "fixtures", "config-no-manifest");
    expect(() => resolveAddfoxConfig(noManifestDir)).toThrow();
    try {
      resolveAddfoxConfig(noManifestDir);
    } catch (e) {
      expect((e as AddfoxError).code).toBe(ADDFOX_ERROR_CODES.MANIFEST_MISSING);
    }
  });

  it("throws when no entries discovered", () => {
    const noEntriesDir = path.join(__dirname, "fixtures", "config-no-entries");
    expect(() => resolveAddfoxConfig(noEntriesDir)).toThrow();
    try {
      resolveAddfoxConfig(noEntriesDir);
    } catch (e) {
      expect((e as AddfoxError).code).toBe(ADDFOX_ERROR_CODES.NO_ENTRIES);
    }
  });

  it("throws when appDir does not exist", () => {
    const missingAppDir = path.join(__dirname, "fixtures", "config-srcdir-missing");
    expect(() => resolveAddfoxConfig(missingAppDir)).toThrow();
    try {
      resolveAddfoxConfig(missingAppDir);
    } catch (e) {
      expect((e as AddfoxError).code).toBe(ADDFOX_ERROR_CODES.APP_DIR_MISSING);
    }
  });
});

describe("loadConfigFile with ADDFOX_CONFIG_RESTART", () => {
  it("loads config with moduleCache disabled when ADDFOX_CONFIG_RESTART is set", () => {
    const saved = process.env.ADDFOX_CONFIG_RESTART;
    try {
      process.env.ADDFOX_CONFIG_RESTART = "1";
      const result = loadConfigFile(fixtureDir);
      expect(result).not.toBeNull();
      expect(result?.manifest?.name).toBe("Fixture");
    } finally {
      if (saved === undefined) delete process.env.ADDFOX_CONFIG_RESTART;
      else process.env.ADDFOX_CONFIG_RESTART = saved;
    }
  });
});

describe("loadConfigFile throws on load error", () => {
  it("throws AddfoxError with CONFIG_LOAD_FAILED when config file throws", () => {
    const loadErrorDir = path.join(__dirname, "fixtures", "config-load-error");
    expect(() => loadConfigFile(loadErrorDir)).toThrow();
    try {
      loadConfigFile(loadErrorDir);
    } catch (e) {
      expect((e as AddfoxError).code).toBe(ADDFOX_ERROR_CODES.CONFIG_LOAD_FAILED);
      expect((e as AddfoxError).message).toContain("Failed to load config file");
    }
  });
});

describe("getResolvedConfigFilePath", () => {
  it("returns the config file path when config exists", () => {
    const result = getResolvedConfigFilePath(fixtureDir);
    expect(result).not.toBeNull();
    expect(result).toMatch(/addfox\.config/);
  });

  it("returns null when no config file exists", () => {
    const result = getResolvedConfigFilePath(emptyDir);
    expect(result).toBeNull();
  });
});

describe("clearConfigCache", () => {
  it("does not throw when clearing cache for any path", () => {
    expect(() => clearConfigCache("/nonexistent/path.js")).not.toThrow();
  });
});
