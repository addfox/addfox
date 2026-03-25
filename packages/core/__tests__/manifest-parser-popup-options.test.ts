import { describe, it, expect } from "@rstest/core";
import { extractEntriesFromManifest } from "../src/entry/manifestParser.js";

describe("manifestParser popup/options/devtools/sidepanel branches", () => {
  describe("popup branches", () => {
    it("should return null when action.default_popup is not valid source", () => {
      const manifest = {
        manifest_version: 3,
        name: "test",
        version: "1.0",
        action: { default_popup: "/dist/popup.html" },
      };
      const result = extractEntriesFromManifest(manifest as any, "chrome");
      expect(result.entries).not.toHaveProperty("popup");
    });

    it("should return null when browser_action.default_popup is not valid source (MV2)", () => {
      const manifest = {
        manifest_version: 2,
        name: "test",
        version: "1.0",
        browser_action: { default_popup: "/dist/popup.html" },
      };
      const result = extractEntriesFromManifest(manifest as any, "chrome");
      expect(result.entries).not.toHaveProperty("popup");
    });

    it("should extract popup from valid source path", () => {
      const manifest = {
        manifest_version: 3,
        name: "test",
        version: "1.0",
        action: { default_popup: "./src/popup.ts" },
      };
      const result = extractEntriesFromManifest(manifest as any, "chrome");
      expect(result.entries["popup"]).toBe("src/popup.ts");
    });
  });

  describe("options branches", () => {
    it("should return null when options_ui.page is not valid source (MV3)", () => {
      const manifest = {
        manifest_version: 3,
        name: "test",
        version: "1.0",
        options_ui: { page: "/dist/options.html" },
      };
      const result = extractEntriesFromManifest(manifest as any, "chrome");
      expect(result.entries).not.toHaveProperty("options");
    });

    it("should return null when options_page is not valid source (MV2)", () => {
      const manifest = {
        manifest_version: 2,
        name: "test",
        version: "1.0",
        options_page: "/dist/options.html",
      };
      const result = extractEntriesFromManifest(manifest as any, "chrome");
      expect(result.entries).not.toHaveProperty("options");
    });

    it("should extract options from valid source path", () => {
      const manifest = {
        manifest_version: 3,
        name: "test",
        version: "1.0",
        options_ui: { page: "./src/options.ts" },
      };
      const result = extractEntriesFromManifest(manifest as any, "chrome");
      expect(result.entries["options"]).toBe("src/options.ts");
    });
  });

  describe("devtools branches", () => {
    it("should return null when devtools_page is not valid source", () => {
      const manifest = {
        manifest_version: 3,
        name: "test",
        version: "1.0",
        devtools_page: "/dist/devtools.html",
      };
      const result = extractEntriesFromManifest(manifest as any, "chrome");
      expect(result.entries).not.toHaveProperty("devtools");
    });

    it("should extract devtools from valid source path", () => {
      const manifest = {
        manifest_version: 3,
        name: "test",
        version: "1.0",
        devtools_page: "./src/devtools.ts",
      };
      const result = extractEntriesFromManifest(manifest as any, "chrome");
      expect(result.entries["devtools"]).toBe("src/devtools.ts");
    });
  });

  describe("sidepanel branches", () => {
    it("should return null when side_panel.default_path is not valid source", () => {
      const manifest = {
        manifest_version: 3,
        name: "test",
        version: "1.0",
        side_panel: { default_path: "/dist/sidepanel.html" },
      };
      const result = extractEntriesFromManifest(manifest as any, "chrome");
      expect(result.entries).not.toHaveProperty("sidepanel");
    });

    it("should extract sidepanel from valid source path", () => {
      const manifest = {
        manifest_version: 3,
        name: "test",
        version: "1.0",
        side_panel: { default_path: "./src/sidepanel.ts" },
      };
      const result = extractEntriesFromManifest(manifest as any, "chrome");
      expect(result.entries["sidepanel"]).toBe("src/sidepanel.ts");
    });
  });
});
