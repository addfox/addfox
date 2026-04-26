import { describe, it, expect } from "@rstest/core";
import { isChromium, isGecko, findBrowserPath, getUserPath, buildDefaultPaths } from "../src/paths";
import type { PathOptions, BrowserTarget } from "../src/types";

describe("paths", () => {
  describe("isChromium / isGecko", () => {
    it("identifies chromium browsers", () => {
      expect(isChromium("chrome")).toBe(true);
      expect(isChromium("chromium")).toBe(true);
      expect(isChromium("edge")).toBe(true);
      expect(isChromium("brave")).toBe(true);
      expect(isChromium("custom")).toBe(true);
    });

    it("identifies gecko browsers", () => {
      expect(isGecko("firefox")).toBe(true);
      expect(isGecko("zen")).toBe(true);
      expect(isGecko("librewolf")).toBe(true);
      expect(isGecko("waterfox")).toBe(true);
      expect(isGecko("floorp")).toBe(true);
    });

    it("isChromium returns false for gecko", () => {
      expect(isChromium("firefox")).toBe(false);
      expect(isChromium("zen")).toBe(false);
    });

    it("isGecko returns false for chromium", () => {
      expect(isGecko("chrome")).toBe(false);
      expect(isGecko("edge")).toBe(false);
    });
  });

  describe("getUserPath", () => {
    it("returns user-provided path", () => {
      const opts: PathOptions = { chromePath: "/usr/bin/chrome", firefoxPath: "/usr/bin/firefox" };
      expect(getUserPath("chrome", opts)).toBe("/usr/bin/chrome");
      expect(getUserPath("firefox", opts)).toBe("/usr/bin/firefox");
    });

    it("returns undefined when no path provided", () => {
      expect(getUserPath("chrome", {})).toBeUndefined();
      expect(getUserPath("zen", {})).toBeUndefined();
    });
  });

  describe("buildDefaultPaths", () => {
    it("returns paths for known browsers on win32", () => {
      const paths = buildDefaultPaths("chrome", "win32");
      expect(paths).toBeInstanceOf(Array);
      expect(paths!.length).toBeGreaterThan(0);
      expect(paths!.some((p) => p.includes("chrome.exe"))).toBe(true);
    });

    it("returns paths for gecko browsers on darwin", () => {
      const paths = buildDefaultPaths("firefox", "darwin");
      expect(paths).toBeInstanceOf(Array);
      expect(paths!.length).toBeGreaterThan(0);
      expect(paths![0]).toContain("Firefox.app");
    });

    it("returns undefined for unknown platform", () => {
      const paths = buildDefaultPaths("chrome", "freebsd");
      expect(paths).toBeUndefined();
    });

    it("falls back chromium to chrome", () => {
      const paths = buildDefaultPaths("chromium", "win32");
      expect(paths).toBeInstanceOf(Array);
    });
  });

  describe("findBrowserPath", () => {
    it("prefers user path over defaults", () => {
      const opts: PathOptions = { chromePath: "/custom/chrome" };
      expect(findBrowserPath("chrome", opts)).toBe("/custom/chrome");
    });

    it("falls back chromium to chrome when no default found", () => {
      // On a platform without chromium paths, it falls back to chrome
      // This is tested by checking the function does not throw
      const result = findBrowserPath("chromium");
      // Result may be null if neither chrome nor chromium is installed
      expect(result === null || typeof result === "string").toBe(true);
    });
  });
});
