import { describe, expect, it } from "@rstest/core";
import {
  resolveManifestChromium,
  resolveManifestFirefox,
  resolveManifestForTarget,
  buildForBrowser,
} from "../src/manifest/builder.ts";
import type { ContentScriptOutput } from "../src/manifest/builder.ts";
import { MANIFEST_ENTRY_PATHS } from "../src/constants.ts";
import type { EntryInfo } from "../src/types.ts";

function entry(name: string, scriptPath: string, htmlPath?: string): EntryInfo {
  return { name, scriptPath, htmlPath };
}

describe("buildForBrowser", () => {
  const baseManifest = {
    name: "Test",
    version: "0.0.1",
    manifest_version: 3,
  };

  describe("buildForBrowser", () => {
    it("replaces [addfox.background] when entry present", () => {
      
      const manifest = {
        ...baseManifest,
        background: { service_worker: "[addfox.background]" },
      };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("background", "/b/index.js")],
        "chromium"
      );
      expect((out as { background?: { service_worker: string } }).background?.service_worker).toBe(
        MANIFEST_ENTRY_PATHS.background
      );
    });

    it("replaces [addfox.content] in content_scripts when content entry present", () => {
      
      const manifest = {
        ...baseManifest,
        content_scripts: [{ matches: ["<all_urls>"], js: ["[addfox.content]"], run_at: "document_start" }],
      };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("content", "/c/index.js")],
        "chromium"
      );
      expect((out as { content_scripts?: { js: string[] }[] }).content_scripts?.[0].js).toEqual([
        MANIFEST_ENTRY_PATHS.content,
      ]);
    });

    it("expands [addfox.content] to multiple js and css when contentScriptOutput provided", () => {
      
      const manifest = {
        ...baseManifest,
        content_scripts: [
          {
            matches: ["<all_urls>"],
            js: ["[addfox.content]"],
            css: ["[addfox.content]"],
          },
        ],
      };
      const contentScriptOutput: ContentScriptOutput = {
        js: ["content/index.js", "static/js/vendor.js"],
        css: ["static/css/content.abc123.css"],
      };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("content", "/c/index.js")],
        "chromium",
        undefined,
        contentScriptOutput
      );
      const cs = (out as { content_scripts?: { js: string[]; css?: string[] }[] }).content_scripts?.[0];
      expect(cs?.js).toEqual(["content/index.js", "static/js/vendor.js"]);
      expect(cs?.css).toEqual(["static/css/content.abc123.css"]);
    });

    it("removes css field when contentScriptOutput.css is empty", () => {
      
      const manifest = {
        ...baseManifest,
        content_scripts: [
          { matches: ["<all_urls>"], js: ["[addfox.content]"], css: ["[addfox.content]"] },
        ],
      };
      const contentScriptOutput: ContentScriptOutput = {
        js: ["content/index.js"],
        css: [],
      };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("content", "/c/index.js")],
        "chromium",
        undefined,
        contentScriptOutput
      );
      const cs = (out as { content_scripts?: Record<string, unknown>[] }).content_scripts?.[0];
      expect(cs?.js).toEqual(["content/index.js"]);
      expect("css" in (cs ?? {})).toBe(false);
    });

    it("removes css field when user has css [addfox.content] and no contentScriptOutput (default empty css)", () => {
      
      const manifest = {
        ...baseManifest,
        content_scripts: [
          { matches: ["<all_urls>"], js: ["[addfox.content]"], css: ["[addfox.content]"] },
        ],
      };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("content", "/c/index.js")],
        "chromium"
      );
      const cs = (out as { content_scripts?: Record<string, unknown>[] }).content_scripts?.[0];
      expect(cs?.js).toEqual([MANIFEST_ENTRY_PATHS.content]);
      expect("css" in (cs ?? {})).toBe(false);
    });

    it("fills js when content_scripts item has only matches and content entry exists", () => {
      
      const manifest = {
        ...baseManifest,
        content_scripts: [{ matches: ["<all_urls>"] }],
      };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("content", "/c/index.js")],
        "chromium"
      );
      const cs = (out as { content_scripts?: { js: string[] }[] }).content_scripts?.[0];
      expect(cs?.js).toEqual([MANIFEST_ENTRY_PATHS.content]);
    });

    it("fills css when content_scripts item has only matches and content css output exists", () => {
      
      const manifest = {
        ...baseManifest,
        content_scripts: [{ matches: ["<all_urls>"] }],
      };
      const contentScriptOutput: ContentScriptOutput = {
        js: ["content/index.js"],
        css: ["static/css/content.hash.css"],
      };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("content", "/c/index.js")],
        "chromium",
        undefined,
        contentScriptOutput
      );
      const cs = (out as { content_scripts?: { js: string[]; css?: string[] }[] }).content_scripts?.[0];
      expect(cs?.js).toEqual(["content/index.js"]);
      expect(cs?.css).toEqual(["static/css/content.hash.css"]);
    });

    it("does not auto-fill css when contentScriptOutput.autoFillCssInManifest is false", () => {
      
      const manifest = {
        ...baseManifest,
        content_scripts: [{ matches: ["<all_urls>"] }],
      };
      const contentScriptOutput: ContentScriptOutput = {
        js: ["content/index.js"],
        css: ["static/css/content.hash.css"],
        autoFillCssInManifest: false,
      };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("content", "/c/index.js")],
        "chromium",
        undefined,
        contentScriptOutput
      );
      const cs = (out as { content_scripts?: { js: string[]; css?: string[] }[] }).content_scripts?.[0];
      expect(cs?.js).toEqual(["content/index.js"]);
      expect(cs?.css).toBeUndefined();
    });

    it("replaces [addfox.devtools] when devtools entry present", () => {
      
      const manifest = { ...baseManifest, devtools_page: "[addfox.devtools]" };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("devtools", "/d/index.js", "/d/index.html")],
        "chromium"
      );
      expect((out as { devtools_page?: string }).devtools_page).toBe(MANIFEST_ENTRY_PATHS.devtools);
    });

    it("does not modify manifest when no placeholders used", () => {
      
      const manifest = {
        ...baseManifest,
        background: { service_worker: "my-background.js" },
      };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("background", "/b/index.js")],
        "chromium"
      );
      expect((out as { background?: { service_worker: string } }).background?.service_worker).toBe(
        "my-background.js"
      );
    });

    it("uses chromium branch when browser is chromium", () => {
      const chromiumManifest = { ...baseManifest, name: "Chromium" };
      const firefoxManifest = { ...baseManifest, name: "Firefox" };
      const config = { chromium: chromiumManifest, firefox: firefoxManifest };
      
      const out = buildForBrowser(config, [], "chromium");
      expect((out as { name?: string }).name).toBe("Chromium");
    });

    it("uses firefox branch when browser is firefox", () => {
      const chromiumManifest = { ...baseManifest, name: "Chromium" };
      const firefoxManifest = { ...baseManifest, name: "Firefox" };
      const config = { chromium: chromiumManifest, firefox: firefoxManifest };
      
      const out = buildForBrowser(config, [], "firefox");
      expect((out as { name?: string }).name).toBe("Firefox");
    });
  });

  describe("resolveManifestChromium / resolveManifestFirefox", () => {
    it("resolveManifestChromium replaces placeholders with entry paths", () => {
      const manifest = {
        ...baseManifest,
        action: { default_popup: "[addfox.popup]" },
        background: { service_worker: "[addfox.background]" },
      };
      const out = resolveManifestChromium(
        { chromium: manifest },
        [entry("popup", "/p/index.js", "/p/index.html"), entry("background", "/b/index.js")]
      );
      expect((out as { action?: { default_popup: string } }).action?.default_popup).toBe(
        MANIFEST_ENTRY_PATHS.popup
      );
      expect((out as { background?: { service_worker: string } }).background?.service_worker).toBe(
        MANIFEST_ENTRY_PATHS.background
      );
    });

    it("resolveManifestFirefox returns firefox manifest", () => {
      const out = resolveManifestFirefox({ firefox: baseManifest }, []);
      expect((out as { name?: string }).name).toBe("Test");
    });
  });

  describe("options and sidepanel", () => {
    it("replaces [addfox.options] when options entry present", () => {
      
      const manifest = {
        ...baseManifest,
        options_ui: { page: "[addfox.options]", open_in_tab: true },
      };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("options", "/o/index.js", "/o/index.html")],
        "chromium"
      );
      expect((out as { options_ui?: { page: string } }).options_ui?.page).toBe(
        MANIFEST_ENTRY_PATHS.options
      );
    });

    it("replaces [addfox.sidepanel] when sidepanel entry present", () => {
      
      const manifest = {
        ...baseManifest,
        side_panel: { default_path: "[addfox.sidepanel]" },
      };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("sidepanel", "/s/index.js", "/s/index.html")],
        "chromium"
      );
      expect((out as { side_panel?: { default_path: string } }).side_panel?.default_path).toBe(
        MANIFEST_ENTRY_PATHS.sidepanel
      );
    });

    it("adds sidePanel permission when sidepanel entry present", () => {
      
      const manifest = { ...baseManifest };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("sidepanel", "/s/index.js", "/s/index.html")],
        "chromium"
      );
      const perms = (out as { permissions?: string[] }).permissions;
      expect(Array.isArray(perms) && perms.includes("sidePanel")).toBe(true);
    });

    it("adds sidePanel permission when user manually set side_panel.default_path", () => {
      
      const manifest = {
        ...baseManifest,
        side_panel: { default_path: "sidepanel/custom.html" },
      };
      const out = buildForBrowser(
        { chromium: manifest },
        [],
        "chromium"
      );
      const perms = (out as { permissions?: string[] }).permissions;
      expect(Array.isArray(perms) && perms.includes("sidePanel")).toBe(true);
    });

    it("replaces [addfox.newtab] in chrome_url_overrides when newtab entry present", () => {
      
      const manifest = {
        ...baseManifest,
        chrome_url_overrides: { newtab: "[addfox.newtab]" },
      };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("newtab", "/n/index.js", "/n/index.html")],
        "chromium"
      );
      expect((out as { chrome_url_overrides?: { newtab?: string } }).chrome_url_overrides?.newtab).toBe(
        MANIFEST_ENTRY_PATHS.newtab
      );
    });

    it("replaces [addfox.sandbox] in sandbox.pages when sandbox entry present", () => {
      
      const manifest = {
        ...baseManifest,
        sandbox: { pages: ["[addfox.sandbox]"] },
      };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("sandbox", "/x/index.js", "/x/index.html")],
        "chromium"
      );
      expect((out as { sandbox?: { pages?: string[] } }).sandbox?.pages).toEqual([
        MANIFEST_ENTRY_PATHS.sandbox,
      ]);
    });

    it("uses firefox fallback to chromium when firefox undefined", () => {
      const config = { chromium: { ...baseManifest, name: "C" } };
      
      const out = buildForBrowser(config, [], "firefox");
      expect((out as { name?: string }).name).toBe("C");
    });

    it("uses chromium fallback to firefox when chromium undefined", () => {
      const config = { firefox: { ...baseManifest, name: "F" } };
      
      const out = buildForBrowser(config, [], "chromium");
      expect((out as { name?: string }).name).toBe("F");
    });

    it("calls onWarn when target missing and uses fallback", () => {
      const config = { chromium: { ...baseManifest, name: "C" } };
      
      const warns: string[] = [];
      const out = buildForBrowser(config, [], "firefox", (msg) => warns.push(msg));
      expect((out as { name?: string }).name).toBe("C");
      expect(warns.some((w) => w.includes("firefox") && w.includes("chromium"))).toBe(true);
    });

    it("keeps unknown [addfox.xxx] placeholder when no entry", () => {
      
      const manifest = { ...baseManifest, action: { default_popup: "[addfox.popup] [addfox.unknown]" } };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("popup", "/p/index.js", "/p/index.html")],
        "chromium"
      );
      const popup = (out as { action?: { default_popup: string } }).action?.default_popup ?? "";
      expect(popup).toContain(MANIFEST_ENTRY_PATHS.popup);
      expect(popup).toContain("[addfox.unknown]");
    });

    it("replaces placeholders in nested arrays and objects", () => {
      
      const manifest = {
        ...baseManifest,
        content_scripts: [{ js: ["[addfox.background]"], matches: ["<all_urls>"] }],
      };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("background", "/b/index.js")],
        "chromium"
      );
      const js = (out as { content_scripts?: { js: string[] }[] }).content_scripts?.[0].js ?? [];
      expect(js[0]).toBe(MANIFEST_ENTRY_PATHS.background);
    });

    it("replacePlaceholdersInValue leaves non-string non-array non-object unchanged", () => {
      
      const manifest = {
        ...baseManifest,
        version: 2,
        action: { default_popup: "[addfox.popup]" },
      };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("popup", "/p/index.js", "/p/index.html")],
        "chromium"
      );
      expect((out as { version?: number }).version).toBe(2);
    });

    it("uses single manifest when not ChromiumFirefoxManifest", () => {
      
      const single = { ...baseManifest, name: "Single" };
      const out = buildForBrowser(single, [], "chromium");
      expect((out as { name?: string }).name).toBe("Single");
    });

    it("calls onWarn when both chromium and firefox exist but target branch is missing", () => {
      const config = {
        chromium: { ...baseManifest, name: "C" },
        firefox: undefined as unknown,
      };
      
      const warns: string[] = [];
      const out = buildForBrowser(config, [], "firefox", (msg) => warns.push(msg));
      expect((out as { name?: string }).name).toBe("C");
      expect(warns.length).toBeGreaterThan(0);
    });

    it("returns empty manifest and warns when no chromium or firefox object", () => {
      const config = { chromium: null, firefox: null } as unknown as { chromium: null; firefox: null };
      
      const warns: string[] = [];
      const out = buildForBrowser(config, [], "chromium", (msg) => warns.push(msg));
      expect(out).toEqual({});
      expect(warns.some((w) => w.includes("fallback"))).toBe(true);
    });

    it("calls onWarn when both branches exist but target key returns non-object (fallback path)", () => {
      let readCount = 0;
      const config = {
        chromium: { ...baseManifest, name: "C" },
        get firefox() {
          readCount++;
          return readCount === 1 ? {} : undefined;
        },
      };
      
      const warns: string[] = [];
      const out = buildForBrowser(config, [], "firefox", (msg) => warns.push(msg));
      expect((out as { name?: string }).name).toBe("C");
      expect(warns.length).toBeGreaterThan(0);
    });

    it("uses chromium fallback and onWarn when both exist but firefox key returns null", () => {
      let firefoxReads = 0;
      const config = {
        chromium: { ...baseManifest, name: "C" },
        get firefox() {
          firefoxReads++;
          return firefoxReads === 1 ? { name: "F" } : null;
        },
      };
      
      const warns: string[] = [];
      const out = buildForBrowser(config, [], "firefox", (msg) => warns.push(msg));
      expect((out as { name?: string }).name).toBe("C");
      expect(warns.some((w) => w.includes("firefox") && w.includes("chromium"))).toBe(true);
    });

    it("resolveManifestForTarget calls onWarn on fallback", () => {
      const config = { chromium: { ...baseManifest, name: "C" } };
      const warns: string[] = [];
      const out = resolveManifestForTarget(
        config,
        [],
        "firefox",
        (msg) => warns.push(msg)
      );
      expect((out as { name?: string }).name).toBe("C");
      expect(warns.length).toBeGreaterThan(0);
    });
  });

  describe("auto-fill entry fields when missing", () => {
    it("auto-fills background.service_worker when missing and background entry exists (MV3)", () => {
      
      const manifest = { ...baseManifest, manifest_version: 3 };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("background", "/b/index.js")],
        "chromium"
      );
      expect((out as { background?: { service_worker: string } }).background?.service_worker).toBe(
        MANIFEST_ENTRY_PATHS.background
      );
    });

    it("auto-fills background.scripts when missing and background entry exists (MV2)", () => {
      
      const manifest = { ...baseManifest, manifest_version: 2 };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("background", "/b/index.js")],
        "chromium"
      );
      const scripts = (out as { background?: { scripts: string[] } }).background?.scripts;
      expect(scripts).toEqual([MANIFEST_ENTRY_PATHS.background]);
    });

    it("auto-fills background.scripts for firefox target when background entry exists (MV3)", () => {
      const manifest = { ...baseManifest, manifest_version: 3 };
      const out = buildForBrowser(
        { firefox: manifest },
        [entry("background", "/b/index.js")],
        "firefox"
      );
      const bg = (out as { background?: { scripts?: string[]; service_worker?: string } }).background;
      expect(bg?.scripts).toEqual([MANIFEST_ENTRY_PATHS.background]);
      expect(bg?.service_worker).toBeUndefined();
    });

    it("auto-fills action.default_popup when missing and popup entry exists (MV3)", () => {
      
      const manifest = { ...baseManifest, manifest_version: 3 };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("popup", "/p/index.js", "/p/index.html")],
        "chromium"
      );
      expect((out as { action?: { default_popup: string } }).action?.default_popup).toBe(
        MANIFEST_ENTRY_PATHS.popup
      );
    });

    it("does not override user-set background.service_worker", () => {
      
      const manifest = {
        ...baseManifest,
        manifest_version: 3,
        background: { service_worker: "my-background.js" },
      };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("background", "/b/index.js")],
        "chromium"
      );
      expect((out as { background?: { service_worker: string } }).background?.service_worker).toBe(
        "my-background.js"
      );
    });

    it("does not add action.default_popup when no popup entry", () => {
      
      const manifest = { ...baseManifest, manifest_version: 3 };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("background", "/b/index.js")],
        "chromium"
      );
      expect((out as { action?: unknown }).action).toBeUndefined();
    });

    it("auto-fills content_scripts when missing and content entry exists", () => {
      
      const manifest = { ...baseManifest, manifest_version: 3 };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("content", "/c/index.js")],
        "chromium"
      );
      const cs = (out as { content_scripts?: { js: string[]; matches: string[] }[] }).content_scripts;
      expect(cs).toHaveLength(1);
      expect(cs?.[0].js).toEqual([MANIFEST_ENTRY_PATHS.content]);
      expect(cs?.[0].matches).toEqual(["<all_urls>"]);
    });

    it("auto-fills options_ui.page when missing and options entry exists (MV3)", () => {
      
      const manifest = { ...baseManifest, manifest_version: 3 };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("options", "/o/index.js", "/o/index.html")],
        "chromium"
      );
      expect((out as { options_ui?: { page: string } }).options_ui?.page).toBe(
        MANIFEST_ENTRY_PATHS.options
      );
    });

    it("auto-fills side_panel.default_path when missing and sidepanel entry exists (MV3)", () => {
      
      const manifest = { ...baseManifest, manifest_version: 3 };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("sidepanel", "/s/index.js", "/s/index.html")],
        "chromium"
      );
      expect((out as { side_panel?: { default_path: string } }).side_panel?.default_path).toBe(
        MANIFEST_ENTRY_PATHS.sidepanel
      );
    });

    it("does not auto-fill side_panel for firefox target", () => {
      const manifest = { ...baseManifest, manifest_version: 3 };
      const out = buildForBrowser(
        { firefox: manifest },
        [entry("sidepanel", "/s/index.js", "/s/index.html")],
        "firefox"
      );
      expect((out as { side_panel?: unknown }).side_panel).toBeUndefined();
      const perms = (out as { permissions?: string[] }).permissions;
      expect(Array.isArray(perms) && perms.includes("sidePanel")).toBe(false);
    });

    it("auto-fills devtools_page when missing and devtools entry exists", () => {
      
      const manifest = { ...baseManifest, manifest_version: 3 };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("devtools", "/d/index.js", "/d/index.html")],
        "chromium"
      );
      expect((out as { devtools_page?: string }).devtools_page).toBe(
        MANIFEST_ENTRY_PATHS.devtools
      );
    });

    it("auto-fills chrome_url_overrides.newtab when missing and newtab entry exists", () => {
      
      const manifest = { ...baseManifest, manifest_version: 3 };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("newtab", "/n/index.js", "/n/index.html")],
        "chromium"
      );
      expect(
        (out as { chrome_url_overrides?: { newtab?: string } }).chrome_url_overrides?.newtab
      ).toBe(MANIFEST_ENTRY_PATHS.newtab);
    });

    it("auto-fills sandbox.pages when missing and sandbox entry exists", () => {
      
      const manifest = { ...baseManifest, manifest_version: 3 };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("sandbox", "/x/index.js", "/x/index.html")],
        "chromium"
      );
      expect((out as { sandbox?: { pages?: string[] } }).sandbox?.pages).toEqual([
        MANIFEST_ENTRY_PATHS.sandbox,
      ]);
    });

    it("does not override user-set sandbox.pages", () => {
      
      const manifest = {
        ...baseManifest,
        manifest_version: 3,
        sandbox: { pages: ["custom/sandbox.html"] },
      };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("sandbox", "/x/index.js", "/x/index.html")],
        "chromium"
      );
      expect((out as { sandbox?: { pages?: string[] } }).sandbox?.pages).toEqual([
        "custom/sandbox.html",
      ]);
    });

    it("auto-fills chrome_url_overrides for bookmarks/history when missing", () => {
      
      const manifest = { ...baseManifest, manifest_version: 3 };
      const out = buildForBrowser(
        { chromium: manifest },
        [
          entry("bookmarks", "/b/index.js", "/b/index.html"),
          entry("history", "/h/index.js", "/h/index.html"),
        ],
        "chromium"
      );
      const overrides = (out as {
        chrome_url_overrides?: { bookmarks?: string; history?: string };
      }).chrome_url_overrides;
      expect(overrides?.bookmarks).toBe(MANIFEST_ENTRY_PATHS.bookmarks);
      expect(overrides?.history).toBe(MANIFEST_ENTRY_PATHS.history);
      expect((out as { permissions?: string[] }).permissions).toContain("bookmarks");
      expect((out as { permissions?: string[] }).permissions).toContain("history");
    });

    it("does not override user-set chrome_url_overrides fields", () => {
      
      const manifest = {
        ...baseManifest,
        manifest_version: 3,
        chrome_url_overrides: {
          newtab: "custom/newtab.html",
          bookmarks: "custom/bookmarks.html",
        },
      };
      const out = buildForBrowser(
        { chromium: manifest },
        [
          entry("newtab", "/n/index.js", "/n/index.html"),
          entry("bookmarks", "/b/index.js", "/b/index.html"),
          entry("history", "/h/index.js", "/h/index.html"),
        ],
        "chromium"
      );
      const overrides = (out as {
        chrome_url_overrides?: { newtab?: string; bookmarks?: string; history?: string };
      }).chrome_url_overrides;
      expect(overrides?.newtab).toBe("custom/newtab.html");
      expect(overrides?.bookmarks).toBe("custom/bookmarks.html");
      expect(overrides?.history).toBe(MANIFEST_ENTRY_PATHS.history);
    });

    it("adds history permission when history entry exists and preserves existing permissions", () => {
      
      const manifest = {
        ...baseManifest,
        manifest_version: 3,
        permissions: ["storage", "tabs"],
      };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("history", "/h/index.js", "/h/index.html")],
        "chromium"
      );
      expect((out as { permissions?: string[] }).permissions).toEqual(["storage", "tabs", "history"]);
    });

    it("does not duplicate history permission when user already set it", () => {
      
      const manifest = {
        ...baseManifest,
        manifest_version: 3,
        permissions: ["history", "storage"],
      };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("history", "/h/index.js", "/h/index.html")],
        "chromium"
      );
      expect((out as { permissions?: string[] }).permissions).toEqual(["history", "storage"]);
    });

    it("adds bookmarks permission when bookmarks entry exists and keeps existing permissions", () => {
      
      const manifest = {
        ...baseManifest,
        manifest_version: 3,
        permissions: ["storage"],
      };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("bookmarks", "/b/index.js", "/b/index.html")],
        "chromium"
      );
      expect((out as { permissions?: string[] }).permissions).toEqual(["storage", "bookmarks"]);
    });

    it("does not duplicate bookmarks permission when user already set it", () => {
      
      const manifest = {
        ...baseManifest,
        manifest_version: 3,
        permissions: ["bookmarks", "storage"],
      };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("bookmarks", "/b/index.js", "/b/index.html")],
        "chromium"
      );
      expect((out as { permissions?: string[] }).permissions).toEqual(["bookmarks", "storage"]);
    });

    it("auto-fills browser_action.default_popup for MV2 when popup entry exists", () => {
      
      const manifest = { ...baseManifest, manifest_version: 2 };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("popup", "/p/index.js", "/p/index.html")],
        "chromium"
      );
      expect(
        (out as { browser_action?: { default_popup: string } }).browser_action?.default_popup
      ).toBe(MANIFEST_ENTRY_PATHS.popup);
    });

    it("auto-fills options_page for MV2 when options entry exists", () => {
      
      const manifest = { ...baseManifest, manifest_version: 2 };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("options", "/o/index.js", "/o/index.html")],
        "chromium"
      );
      expect((out as { options_page?: string }).options_page).toBe(
        MANIFEST_ENTRY_PATHS.options
      );
    });

    it("auto-fills sandbox.pages when sandbox object has empty pages", () => {
      
      const manifest = { ...baseManifest, manifest_version: 3, sandbox: { pages: [] } };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("sandbox", "/x/index.js", "/x/index.html")],
        "chromium"
      );
      expect((out as { sandbox?: { pages?: string[] } }).sandbox?.pages).toEqual([
        MANIFEST_ENTRY_PATHS.sandbox,
      ]);
    });

    it("auto-fills sandbox.pages when sandbox is null", () => {
      
      const manifest = { ...baseManifest, manifest_version: 3, sandbox: null };
      const out = buildForBrowser(
        { chromium: manifest },
        [entry("sandbox", "/x/index.js", "/x/index.html")],
        "chromium"
      );
      expect((out as { sandbox?: { pages?: string[] } }).sandbox?.pages).toEqual([
        MANIFEST_ENTRY_PATHS.sandbox,
      ]);
    });
  });
});
