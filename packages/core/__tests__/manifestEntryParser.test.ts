import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "@rstest/core";
import { extractEntriesFromManifest } from "../src/entry/manifestParser.ts";
import type { ManifestRecord } from "../src/types.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("ManifestEntryParser", () => {
  describe("extractEntriesFromManifest", () => {
    it("extracts background service_worker source path", () => {
      const manifest: ManifestRecord = {
        name: "Test",
        version: "1.0",
        manifest_version: 3,
        background: {
          service_worker: "./background/index.ts",
        },
      };

      const result = extractEntriesFromManifest(manifest, "chromium");
      
      expect(result.entries.background).toBe("background/index.ts");
      expect(result.replacementMap.get("background.service_worker")).toBe("background");
    });

    it("extracts background scripts array source path", () => {
      const manifest: ManifestRecord = {
        name: "Test",
        version: "1.0",
        manifest_version: 2,
        background: {
          scripts: ["./background/index.ts"],
          persistent: false,
        },
      };

      const result = extractEntriesFromManifest(manifest, "chromium");
      
      expect(result.entries.background).toBe("background/index.ts");
      expect(result.replacementMap.get("background.scripts[0]")).toBe("background");
    });

    it("extracts action.default_popup source path for MV3", () => {
      const manifest: ManifestRecord = {
        name: "Test",
        version: "1.0",
        manifest_version: 3,
        action: {
          default_popup: "./popup/index.tsx",
        },
      };

      const result = extractEntriesFromManifest(manifest, "chromium");
      
      expect(result.entries.popup).toBe("popup/index.tsx");
      expect(result.replacementMap.get("action.default_popup")).toBe("popup");
    });

    it("extracts browser_action.default_popup source path for MV2", () => {
      const manifest: ManifestRecord = {
        name: "Test",
        version: "1.0",
        manifest_version: 2,
        browser_action: {
          default_popup: "./popup/index.tsx",
        },
      };

      const result = extractEntriesFromManifest(manifest, "chromium");
      
      expect(result.entries.popup).toBe("popup/index.tsx");
      expect(result.replacementMap.get("browser_action.default_popup")).toBe("popup");
    });

    it("extracts options_ui.page source path for MV3", () => {
      const manifest: ManifestRecord = {
        name: "Test",
        version: "1.0",
        manifest_version: 3,
        options_ui: {
          page: "./options/index.tsx",
        },
      };

      const result = extractEntriesFromManifest(manifest, "chromium");
      
      expect(result.entries.options).toBe("options/index.tsx");
      expect(result.replacementMap.get("options_ui.page")).toBe("options");
    });

    it("extracts options_page source path for MV2", () => {
      const manifest: ManifestRecord = {
        name: "Test",
        version: "1.0",
        manifest_version: 2,
        options_page: "./options/index.tsx",
      };

      const result = extractEntriesFromManifest(manifest, "chromium");
      
      expect(result.entries.options).toBe("options/index.tsx");
      expect(result.replacementMap.get("options_page")).toBe("options");
    });

    it("extracts devtools_page source path", () => {
      const manifest: ManifestRecord = {
        name: "Test",
        version: "1.0",
        manifest_version: 3,
        devtools_page: "./devtools/index.ts",
      };

      const result = extractEntriesFromManifest(manifest, "chromium");
      
      expect(result.entries.devtools).toBe("devtools/index.ts");
      expect(result.replacementMap.get("devtools_page")).toBe("devtools");
    });

    it("extracts side_panel.default_path source path", () => {
      const manifest: ManifestRecord = {
        name: "Test",
        version: "1.0",
        manifest_version: 3,
        side_panel: {
          default_path: "./sidepanel/index.tsx",
        },
      };

      const result = extractEntriesFromManifest(manifest, "chromium");
      
      expect(result.entries.sidepanel).toBe("sidepanel/index.tsx");
      expect(result.replacementMap.get("side_panel.default_path")).toBe("sidepanel");
    });

    it("extracts sandbox.pages source path", () => {
      const manifest: ManifestRecord = {
        name: "Test",
        version: "1.0",
        manifest_version: 3,
        sandbox: {
          pages: ["./sandbox/index.ts"],
        },
      };

      const result = extractEntriesFromManifest(manifest, "chromium");
      
      expect(result.entries.sandbox).toBe("sandbox/index.ts");
      expect(result.replacementMap.get("sandbox.pages[0]")).toBe("sandbox");
    });

    it("extracts chrome_url_overrides source paths", () => {
      const manifest: ManifestRecord = {
        name: "Test",
        version: "1.0",
        manifest_version: 3,
        chrome_url_overrides: {
          newtab: "./newtab/index.ts",
          bookmarks: "./bookmarks/index.ts",
          history: "./history/index.ts",
        },
      };

      const result = extractEntriesFromManifest(manifest, "chromium");
      
      expect(result.entries.newtab).toBe("newtab/index.ts");
      expect(result.entries.bookmarks).toBe("bookmarks/index.ts");
      expect(result.entries.history).toBe("history/index.ts");
    });

    it("extracts content_scripts js source path", () => {
      const manifest: ManifestRecord = {
        name: "Test",
        version: "1.0",
        manifest_version: 3,
        content_scripts: [
          {
            matches: ["<all_urls>"],
            js: ["./content/index.ts"],
          },
        ],
      };

      const result = extractEntriesFromManifest(manifest, "chromium");
      
      expect(result.entries.content).toBe("content/index.ts");
      expect(result.replacementMap.get("content_scripts[0].js[0]")).toBe("content");
    });

    it("does not extract output paths (non-source files)", () => {
      const manifest: ManifestRecord = {
        name: "Test",
        version: "1.0",
        manifest_version: 3,
        background: {
          service_worker: "background/index.js",  // .js can be a source file too
        },
        action: {
          default_popup: "popup/index.html",  // HTML path, not a source file
        },
      };

      const result = extractEntriesFromManifest(manifest, "chromium");
      
      // .js is treated as source (can be JS source)
      expect(result.entries.background).toBe("background/index.js");
      // HTML path is not extracted as entry
      expect(result.entries.popup).toBeUndefined();
    });

    it("handles multiple entries", () => {
      const manifest: ManifestRecord = {
        name: "Test",
        version: "1.0",
        manifest_version: 3,
        background: {
          service_worker: "./background/index.ts",
        },
        action: {
          default_popup: "./popup/index.tsx",
        },
        options_ui: {
          page: "./options/index.tsx",
        },
        content_scripts: [
          {
            matches: ["<all_urls>"],
            js: ["./content/index.ts"],
          },
        ],
      };

      const result = extractEntriesFromManifest(manifest, "chromium");
      
      expect(Object.keys(result.entries)).toHaveLength(4);
      expect(result.entries.background).toBe("background/index.ts");
      expect(result.entries.popup).toBe("popup/index.tsx");
      expect(result.entries.options).toBe("options/index.tsx");
      expect(result.entries.content).toBe("content/index.ts");
    });

    it("handles paths without leading ./", () => {
      const manifest: ManifestRecord = {
        name: "Test",
        version: "1.0",
        manifest_version: 3,
        background: {
          service_worker: "background/index.ts",
        },
      };

      const result = extractEntriesFromManifest(manifest, "chromium");
      
      expect(result.entries.background).toBe("background/index.ts");
    });

    it("handles .jsx extension", () => {
      const manifest: ManifestRecord = {
        name: "Test",
        version: "1.0",
        manifest_version: 3,
        action: {
          default_popup: "./popup/index.jsx",
        },
      };

      const result = extractEntriesFromManifest(manifest, "chromium");
      
      expect(result.entries.popup).toBe("popup/index.jsx");
    });

    it("handles .js extension", () => {
      const manifest: ManifestRecord = {
        name: "Test",
        version: "1.0",
        manifest_version: 3,
        background: {
          service_worker: "./background/index.js",
        },
      };

      const result = extractEntriesFromManifest(manifest, "chromium");
      
      expect(result.entries.background).toBe("background/index.js");
    });
  });
});
