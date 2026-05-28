import { describe, it, expect } from "@rstest/core";
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
  });
});
