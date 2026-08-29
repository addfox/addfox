import { describe, it, expect } from "@rstest/core";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildChromeFlags } from "../../src/chromium/runner";
import type { ChromiumLaunchOptions } from "../../src/chromium/runner";

describe("chromium runner", () => {
  describe("buildChromeFlags", () => {
    const baseOpts: ChromiumLaunchOptions = { target: "chrome" };

    it("does not include --enable-automation", () => {
      const flags = buildChromeFlags(baseOpts, "/tmp/chrome", [], false);
      expect(flags.some((f) => f.includes("enable-automation"))).toBe(false);
    });

    it("includes --remote-debugging-pipe in CDP mode", () => {
      const flags = buildChromeFlags(baseOpts, "/tmp/chrome", [], false);
      expect(flags).toContain("--remote-debugging-pipe");
    });

    it("includes --enable-unsafe-extension-debugging in CDP mode", () => {
      const flags = buildChromeFlags(baseOpts, "/tmp/chrome", [], false);
      expect(flags).toContain("--enable-unsafe-extension-debugging");
    });

    it("does not include --remote-debugging-pipe in fallback mode", () => {
      const flags = buildChromeFlags(baseOpts, "/tmp/chrome", ["/ext"], true);
      expect(flags).not.toContain("--remote-debugging-pipe");
    });

    it("includes --load-extension in fallback mode", () => {
      const flags = buildChromeFlags(baseOpts, "/tmp/chrome", ["/ext1", "/ext2"], true);
      const loadExt = flags.find((f) => f.startsWith("--load-extension="));
      expect(loadExt).toBeDefined();
      expect(loadExt).toContain("/ext1,/ext2");
    });

    it("sets --user-data-dir", () => {
      const flags = buildChromeFlags(baseOpts, "/my/data", [], false);
      expect(flags).toContain("--user-data-dir=/my/data");
    });

    it("adds startUrl when provided", () => {
      const flags = buildChromeFlags(
        { ...baseOpts, startUrl: "chrome://extensions" },
        "/tmp",
        [],
        false,
      );
      expect(flags).toContain("chrome://extensions");
    });

    it("appends custom args", () => {
      const flags = buildChromeFlags(
        { ...baseOpts, args: ["--incognito", "--headless"] },
        "/tmp",
        [],
        false,
      );
      expect(flags).toContain("--incognito");
      expect(flags).toContain("--headless");
    });

    it("adds --auto-open-devtools-for-tabs when devtools is true", () => {
      const flags = buildChromeFlags(
        { ...baseOpts, devtools: true },
        "/tmp",
        [],
        false,
      );
      expect(flags).toContain("--auto-open-devtools-for-tabs");
    });

    it("does not add --auto-open-devtools-for-tabs when devtools is false", () => {
      const flags = buildChromeFlags(baseOpts, "/tmp", [], false);
      expect(flags).not.toContain("--auto-open-devtools-for-tabs");
    });

    it("bounds cache growth with default cache flags", () => {
      const flags = buildChromeFlags(baseOpts, "/tmp", [], false);
      expect(flags).toContain(`--disk-cache-size=${64 * 1024 * 1024}`);
      expect(flags).toContain(`--media-cache-size=${32 * 1024 * 1024}`);
      expect(flags).toContain("--aggressive-cache-discard");
      expect(flags).toContain("--disable-gpu-shader-disk-cache");
      expect(flags).toContain("--disable-breakpad");
    });

    it("honours a custom diskCacheSize", () => {
      const flags = buildChromeFlags({ ...baseOpts, diskCacheSize: 1024 }, "/tmp", [], false);
      expect(flags).toContain("--disk-cache-size=1024");
      expect(flags.some((f) => f.startsWith("--disk-cache-size=") && f !== "--disk-cache-size=1024")).toBe(false);
    });

    describe("MV2 re-enable flags (Chrome 139+)", () => {
      const withManifest = (mv: number): string => {
        const dir = mkdtempSync(join(tmpdir(), "addfox-mv-"));
        writeFileSync(
          join(dir, "manifest.json"),
          JSON.stringify({ manifest_version: mv, name: "x", version: "1.0.0" }),
        );
        return dir;
      };

      it("adds MV2 re-enable flags when an extension uses manifest_version 2", () => {
        const dir = withManifest(2);
        try {
          const flags = buildChromeFlags(baseOpts, "/tmp", [dir], false);
          const disable = flags.find((f) => f.startsWith("--disable-features=")) ?? "";
          expect(disable).toContain("ExtensionManifestV2Unsupported");
          expect(disable).toContain("ExtensionManifestV2Disabled");
          expect(flags).toContain("--enable-features=AllowLegacyMV2Extensions");
        } finally {
          rmSync(dir, { recursive: true, force: true });
        }
      });

      it("adds MV2 flags when a later extension (not the first) is MV2", () => {
        const mv3 = withManifest(3);
        const mv2 = withManifest(2);
        try {
          const flags = buildChromeFlags(baseOpts, "/tmp", [mv3, mv2], false);
          expect(flags).toContain("--enable-features=AllowLegacyMV2Extensions");
        } finally {
          rmSync(mv3, { recursive: true, force: true });
          rmSync(mv2, { recursive: true, force: true });
        }
      });

      it("does not add MV2 flags for MV3-only extensions", () => {
        const dir = withManifest(3);
        try {
          const flags = buildChromeFlags(baseOpts, "/tmp", [dir], false);
          expect(flags.some((f) => f.includes("AllowLegacyMV2Extensions"))).toBe(false);
          const disable = flags.find((f) => f.startsWith("--disable-features=")) ?? "";
          expect(disable).not.toContain("ExtensionManifestV2");
        } finally {
          rmSync(dir, { recursive: true, force: true });
        }
      });

      it("does not add MV2 flags when there are no extension paths", () => {
        const flags = buildChromeFlags(baseOpts, "/tmp", [], false);
        expect(flags.some((f) => f.includes("AllowLegacyMV2Extensions"))).toBe(false);
      });
    });
  });
});
