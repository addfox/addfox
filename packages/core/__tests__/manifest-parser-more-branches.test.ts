import { describe, it, expect } from "@rstest/core";
import { extractEntriesFromManifest } from "../src/entry/manifestParser.js";

describe("manifestParser additional branches", () => {
  describe("sandbox branches", () => {
    it("should return null when sandbox.pages[0] is not valid source", () => {
      const manifest = {
        manifest_version: 3,
        name: "test",
        version: "1.0",
        sandbox: { pages: ["/invalid/path.ext"] },
      };
      const result = extractEntriesFromManifest(manifest as any, "chrome");
      expect(result.entries).not.toHaveProperty("sandbox");
    });

    it("should extract sandbox from valid source path", () => {
      const manifest = {
        manifest_version: 3,
        name: "test",
        version: "1.0",
        sandbox: { pages: ["./src/sandbox.ts"] },
      };
      const result = extractEntriesFromManifest(manifest as any, "chrome");
      expect(result.entries["sandbox"]).toBe("src/sandbox.ts");
    });

    it("should handle sandbox with empty pages array", () => {
      const manifest = {
        manifest_version: 3,
        name: "test",
        version: "1.0",
        sandbox: { pages: [] },
      };
      const result = extractEntriesFromManifest(manifest as any, "chrome");
      expect(result.entries).not.toHaveProperty("sandbox");
    });
  });

  describe("chrome_url_overrides branches", () => {
    it("should return empty array when no chrome_url_overrides", () => {
      const manifest = {
        manifest_version: 3,
        name: "test",
        version: "1.0",
      };
      const result = extractEntriesFromManifest(manifest as any, "chrome");
      expect(result.entries).not.toHaveProperty("newtab");
    });

    it("should skip invalid source paths in chrome_url_overrides", () => {
      const manifest = {
        manifest_version: 3,
        name: "test",
        version: "1.0",
        chrome_url_overrides: {
          newtab: "/invalid/path.html", // not .ts/.tsx/.js/.jsx
          bookmarks: "/dist/build.js", // in /dist/ directory, so not a source file
          history: "not-a-source-file.ext" // wrong extension
        },
      };
      const result = extractEntriesFromManifest(manifest as any, "chrome");
      // All paths are invalid, so no entries should be extracted
      expect(Object.keys(result.entries).filter(k => ['newtab', 'bookmarks', 'history'].includes(k))).toHaveLength(0);
    });

    it("should extract valid source paths from chrome_url_overrides", () => {
      const manifest = {
        manifest_version: 3,
        name: "test",
        version: "1.0",
        chrome_url_overrides: {
          newtab: "./src/newtab.ts",
        },
      };
      const result = extractEntriesFromManifest(manifest as any, "chrome");
      expect(result.entries["newtab"]).toBe("src/newtab.ts");
    });

    it("should handle mixed valid and invalid paths in chrome_url_overrides", () => {
      const manifest = {
        manifest_version: 3,
        name: "test",
        version: "1.0",
        chrome_url_overrides: {
          newtab: "./src/newtab.ts",
          bookmarks: "/invalid/path.html",
          history: "./src/history.ts",
        },
      };
      const result = extractEntriesFromManifest(manifest as any, "chrome");
      expect(result.entries["newtab"]).toBe("src/newtab.ts");
      expect(result.entries["history"]).toBe("src/history.ts");
      expect(result.entries).not.toHaveProperty("bookmarks");
    });
  });
});
