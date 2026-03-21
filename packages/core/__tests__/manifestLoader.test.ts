import path from "path";
import { fileURLToPath } from "url";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";
import { describe, expect, it, beforeEach, afterEach } from "@rstest/core";
import { resolveManifestInput } from "../src/manifest/loader.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureSrc = path.join(__dirname, "fixtures", "manifest-loader", "src");

describe("ManifestLoader", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(tmpdir(), `addfox-manifest-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
  });

  describe("resolve with null/undefined", () => {
    it("loads from appDir when manifest.json exists", () => {
      const result = resolveManifestInput(undefined, "/root", fixtureSrc);
      expect(result).not.toBeNull();
      expect((result as { chromium?: { name?: string } }).chromium?.name).toBe("Fixture");
    });

    it("loads from appDir/manifest when no manifest in appDir but in subdir", () => {
      const subdirOnly = path.join(tempDir, "subdir-only");
      mkdirSync(path.join(subdirOnly, "manifest"), { recursive: true });
      writeFileSync(
        path.join(subdirOnly, "manifest", "manifest.json"),
        '{"name":"SubdirOnly","version":"1.0.0","manifest_version":3}',
        "utf-8"
      );
      const resultSub = resolveManifestInput(null, "/root", subdirOnly);
      expect(resultSub).not.toBeNull();
      expect((resultSub as { chromium?: { name?: string } }).chromium?.name).toBe("SubdirOnly");
    });

    it("returns null when no manifest files exist", () => {
      const result = resolveManifestInput(null, "/root", tempDir);
      expect(result).toBeNull();
    });
  });

  describe("resolve with path config", () => {
    it("loads chromium and firefox from paths", () => {
      const chromiumPath = path.join(tempDir, "manifest.json");
      const firefoxPath = path.join(tempDir, "firefox.json");
      writeFileSync(chromiumPath, '{"name":"Chromium","version":"1.0.0","manifest_version":3}', "utf-8");
      writeFileSync(firefoxPath, '{"name":"Firefox","version":"1.0.0","manifest_version":3}', "utf-8");
      const result = resolveManifestInput(
        { chromium: "manifest.json", firefox: "firefox.json" },
        "/root",
        tempDir
      );
      expect(result).not.toBeNull();
      expect((result as { chromium?: { name?: string } }).chromium?.name).toBe("Chromium");
      expect((result as { firefox?: { name?: string } }).firefox?.name).toBe("Firefox");
    });

    it("returns null when path config but files missing", () => {
      const result = resolveManifestInput(
        { chromium: "nonexistent.json", firefox: "also-missing.json" },
        "/root",
        tempDir
      );
      expect(result).toBeNull();
    });
  });

  describe("resolve with chromium/firefox object", () => {
    it("returns input when chromium/firefox object", () => {
      const config = {
        chromium: { name: "C", version: "1.0.0", manifest_version: 3 },
        firefox: { name: "F", version: "1.0.0", manifest_version: 3 },
      };
      const result = resolveManifestInput(config, "/root", tempDir);
      expect(result).toBe(config);
      expect((result as { chromium?: { name?: string } }).chromium?.name).toBe("C");
    });
  });

  describe("resolve with plain object", () => {
    it("returns input as single manifest", () => {
      const config = { name: "Plain", version: "1.0.0", manifest_version: 3 };
      const result = resolveManifestInput(config, "/root", tempDir);
      expect(result).toEqual(config);
    });
  });

  describe("buildConfigFromFiles and deepMerge", () => {
    it("merges base with chromium and firefox overrides", () => {
      const dir = path.join(tempDir, "merge");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        path.join(dir, "manifest.json"),
        '{"name":"Base","version":"1.0.0","manifest_version":3}',
        "utf-8"
      );
      writeFileSync(
        path.join(dir, "manifest.chromium.json"),
        '{"name":"Chromium"}',
        "utf-8"
      );
      writeFileSync(
        path.join(dir, "manifest.firefox.json"),
        '{"name":"Firefox"}',
        "utf-8"
      );
      const result = resolveManifestInput(null, "/root", dir);
      expect(result).not.toBeNull();
      expect((result as { chromium?: { name?: string } }).chromium?.name).toBe("Chromium");
      expect((result as { firefox?: { name?: string } }).firefox?.name).toBe("Firefox");
    });

    it("deepMerge overwrites with primitive and array (non-object branch)", () => {
      const dir = path.join(tempDir, "merge-prim");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        path.join(dir, "manifest.json"),
        '{"name":"Base","permissions":["a","b"],"manifest_version":3}',
        "utf-8"
      );
      writeFileSync(
        path.join(dir, "manifest.chromium.json"),
        '{"name":"Chromium","permissions":["c"]}',
        "utf-8"
      );
      const result = resolveManifestInput(null, "/root", dir);
      expect(result).not.toBeNull();
      const chrom = (result as { chromium?: { name?: string; permissions?: string[] } }).chromium;
      expect(chrom?.name).toBe("Chromium");
      expect(chrom?.permissions).toEqual(["c"]);
    });

    it("deepMerge overwrites nested object with primitive (else branch)", () => {
      const dir = path.join(tempDir, "merge-nested-prim");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        path.join(dir, "manifest.json"),
        '{"name":"Base","options":{"page":"options.html"},"manifest_version":3}',
        "utf-8"
      );
      writeFileSync(
        path.join(dir, "manifest.chromium.json"),
        '{"options_ui":{"page":"[addfox.options]"}}',
        "utf-8"
      );
      const result = resolveManifestInput(null, "/root", dir);
      expect(result).not.toBeNull();
      const chrom = (result as { chromium?: { options_ui?: { page?: string } } }).chromium;
      expect(chrom?.options_ui?.page).toBe("[addfox.options]");
    });

    it("deepMerge recursively merges nested objects (object branch)", () => {
      const dir = path.join(tempDir, "merge-nested-obj");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        path.join(dir, "manifest.json"),
        '{"name":"Base","action":{"default_popup":"a.html"},"manifest_version":3}',
        "utf-8"
      );
      writeFileSync(
        path.join(dir, "manifest.chromium.json"),
        '{"action":{"default_popup":"b.html"}}',
        "utf-8"
      );
      const result = resolveManifestInput(null, "/root", dir);
      expect(result).not.toBeNull();
      const chrom = (result as { chromium?: { action?: { default_popup?: string } } }).chromium;
      expect(chrom?.action?.default_popup).toBe("b.html");
    });
  });

  describe("readManifestJson edge cases", () => {
    it("returns null for invalid JSON in file", () => {
      const badPath = path.join(tempDir, "bad.json");
      writeFileSync(badPath, "not json {", "utf-8");
      const result = resolveManifestInput({ chromium: "bad.json" }, "/root", tempDir);
      expect(result).toBeNull();
    });

    it("returns null for primitive JSON", () => {
      const primPath = path.join(tempDir, "prim.json");
      writeFileSync(primPath, "1", "utf-8");
      const result = resolveManifestInput({ chromium: "prim.json" }, "/root", tempDir);
      expect(result).toBeNull();
    });
  });

  describe("validateManifestRecord", () => {
    it("throws when manifest_version is missing", () => {
      expect(() =>
        resolveManifestInput({ name: "X", version: "1.0.0" }, "/root", tempDir)
      ).toThrow("manifest_version must be 2 or 3");
    });

    it("throws when manifest_version is not 2 or 3", () => {
      expect(() =>
        resolveManifestInput({ name: "X", version: "1.0.0", manifest_version: 4 }, "/root", tempDir)
      ).toThrow("manifest_version must be 2 or 3");
    });

    it("throws MV2 when manifest_version 2 has action", () => {
      expect(() =>
        resolveManifestInput(
          { name: "X", version: "1.0.0", manifest_version: 2, action: { default_popup: "popup.html" } },
          "/root",
          tempDir
        )
      ).toThrow("MV2 does not support \"action\"");
    });

    it("throws MV3 when manifest_version 3 has browser_action", () => {
      expect(() =>
        resolveManifestInput(
          { name: "X", version: "1.0.0", manifest_version: 3, browser_action: {} },
          "/root",
          tempDir
        )
      ).toThrow("MV3 does not support \"browser_action\"");
    });

    it("throws when MV3 (Chrome) background has scripts in single manifest", () => {
      expect(() =>
        resolveManifestInput(
          { name: "X", version: "1.0.0", manifest_version: 3, background: { scripts: ["bg.js"] } },
          "/root",
          tempDir
        )
      ).toThrow("background.scripts");
    });

    it("throws when permissions is not string[]", () => {
      expect(() =>
        resolveManifestInput(
          { name: "X", version: "1.0.0", manifest_version: 3, permissions: "storage" as unknown as string[] },
          "/root",
          tempDir
        )
      ).toThrow("permissions");
    });

    it("throws when action.default_popup is not a string", () => {
      expect(() =>
        resolveManifestInput(
          { name: "X", version: "1.0.0", manifest_version: 3, action: { default_popup: 123 } },
          "/root",
          tempDir
        )
      ).toThrow("action.default_popup");
    });

    it("throws when action is not an object", () => {
      expect(() =>
        resolveManifestInput(
          { name: "X", version: "1.0.0", manifest_version: 3, action: "popup" as unknown as object },
          "/root",
          tempDir
        )
      ).toThrow("action");
    });

    it("throws when MV2 background is not an object", () => {
      expect(() =>
        resolveManifestInput(
          { name: "X", version: "1.0.0", manifest_version: 2, background: "bg.js" as unknown as object },
          "/root",
          tempDir
        )
      ).toThrow("background");
    });

    it("throws when MV2 background.page is not a string", () => {
      expect(() =>
        resolveManifestInput(
          { name: "X", version: "1.0.0", manifest_version: 2, background: { page: 123 } },
          "/root",
          tempDir
        )
      ).toThrow("background.page");
    });

    it("throws when MV3 background is not an object", () => {
      expect(() =>
        resolveManifestInput(
          { name: "X", version: "1.0.0", manifest_version: 3, background: "sw.js" as unknown as object },
          "/root",
          tempDir
        )
      ).toThrow("background");
    });

    it("throws when MV2 has host_permissions", () => {
      expect(() =>
        resolveManifestInput(
          { name: "X", version: "1.0.0", manifest_version: 2, host_permissions: ["<all_urls>"] },
          "/root",
          tempDir
        )
      ).toThrow("host_permissions");
    });

    it("throws when MV2 background has service_worker", () => {
      expect(() =>
        resolveManifestInput(
          { name: "X", version: "1.0.0", manifest_version: 2, background: { service_worker: "bg.js" } },
          "/root",
          tempDir
        )
      ).toThrow("background.service_worker");
    });

    it("throws when MV3 background.service_worker is not string", () => {
      expect(() =>
        resolveManifestInput(
          { name: "X", version: "1.0.0", manifest_version: 3, background: { service_worker: 123 } },
          "/root",
          tempDir
        )
      ).toThrow("background.service_worker");
    });

    it("throws when chromium/firefox object has invalid chromium record", () => {
      expect(() =>
        resolveManifestInput(
          {
            chromium: { name: "C", version: "1.0.0", manifest_version: 3, action: { default_popup: 99 } },
            firefox: { name: "F", version: "1.0.0", manifest_version: 3 },
          },
          "/root",
          tempDir
        )
      ).toThrow("action.default_popup");
    });

    it("accepts Firefox MV3 manifest with background.scripts", () => {
      const config = {
        chromium: { name: "C", version: "1.0.0", manifest_version: 3, background: { service_worker: "bg.js" } },
        firefox: { name: "F", version: "1.0.0", manifest_version: 3, background: { scripts: ["bg.js"] } },
      };
      const result = resolveManifestInput(config, "/root", tempDir);
      expect(result).toEqual(config);
    });

    it("accepts Firefox MV3 manifest with background.page", () => {
      const config = {
        firefox: { name: "F", version: "1.0.0", manifest_version: 3, background: { page: "background.html" } },
      };
      const result = resolveManifestInput(config, "/root", tempDir);
      expect(result).toEqual(config);
    });

    it("throws when chromium branch has MV3 background.scripts", () => {
      expect(() =>
        resolveManifestInput(
          {
            chromium: { name: "C", version: "1.0.0", manifest_version: 3, background: { scripts: ["bg.js"] } },
            firefox: { name: "F", version: "1.0.0", manifest_version: 3 },
          },
          "/root",
          tempDir
        )
      ).toThrow("background.scripts");
    });

    it("throws when Firefox MV3 background.scripts is not string[]", () => {
      expect(() =>
        resolveManifestInput(
          {
            firefox: { name: "F", version: "1.0.0", manifest_version: 3, background: { scripts: "bg.js" } },
          },
          "/root",
          tempDir
        )
      ).toThrow("background.scripts");
    });

    it("throws when Firefox MV3 background.page is not string", () => {
      expect(() =>
        resolveManifestInput(
          {
            firefox: { name: "F", version: "1.0.0", manifest_version: 3, background: { page: 123 } },
          },
          "/root",
          tempDir
        )
      ).toThrow("background.page");
    });

    it("throws when Firefox MV3 background.service_worker is not string", () => {
      expect(() =>
        resolveManifestInput(
          {
            firefox: { name: "F", version: "1.0.0", manifest_version: 3, background: { service_worker: 123 } },
          },
          "/root",
          tempDir
        )
      ).toThrow("background.service_worker");
    });

    it("throws when Firefox MV3 background has both page and scripts", () => {
      expect(() =>
        resolveManifestInput(
          {
            firefox: {
              name: "F",
              version: "1.0.0",
              manifest_version: 3,
              background: { page: "a.html", scripts: ["b.js"] },
            },
          },
          "/root",
          tempDir
        )
      ).toThrow("cannot have both");
    });

    it("throws when MV3 (Chrome) background has page field", () => {
      expect(() =>
        resolveManifestInput(
          { name: "X", version: "1.0.0", manifest_version: 3, background: { page: "bg.html" } },
          "/root",
          tempDir
        )
      ).toThrow("background.page");
    });

    it("throws when Firefox MV3 background is not an object", () => {
      expect(() =>
        resolveManifestInput(
          {
            firefox: { name: "F", version: "1.0.0", manifest_version: 3, background: "bg.js" as unknown as object },
          },
          "/root",
          tempDir
        )
      ).toThrow("background");
    });

    it("accepts Firefox MV3 with empty background object", () => {
      const config = {
        firefox: { name: "F", version: "1.0.0", manifest_version: 3, background: {} },
      };
      const result = resolveManifestInput(config, "/root", tempDir);
      expect(result).toEqual(config);
    });

    it("throws when MV3 host_permissions is not string[]", () => {
      expect(() =>
        resolveManifestInput(
          { name: "X", version: "1.0.0", manifest_version: 3, host_permissions: "bad" as unknown as string[] },
          "/root",
          tempDir
        )
      ).toThrow("host_permissions");
    });

    it("throws when MV2 background.scripts is not string[]", () => {
      expect(() =>
        resolveManifestInput(
          { name: "X", version: "1.0.0", manifest_version: 2, background: { scripts: "bg.js" } },
          "/root",
          tempDir
        )
      ).toThrow("background.scripts");
    });
  });
});
