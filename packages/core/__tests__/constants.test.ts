import { describe, expect, it } from "@rstest/core";
import {
  CONFIG_FILES,
  SCRIPT_EXTS,
  RESERVED_ENTRY_NAMES,
  HTML_ENTRY_NAMES,
  SCRIPT_ONLY_ENTRY_NAMES,
  DEFAULT_OUT_DIR,
  DEFAULT_APP_DIR,
  ADDFOX_OUTPUT_ROOT,
  CLI_COMMANDS,
  RSTEST_CONFIG_FILES,
  SUPPORTED_BROWSERS,
  MANIFEST_ENTRY_PATHS,
  BROWSER_OUTPUT_PREFIX,
  getBrowserOutputDir,
} from "../src/constants.ts";

describe("constants", () => {
  it("CONFIG_FILES includes addfox.config.ts and addfox.config.js", () => {
    expect(CONFIG_FILES).toContain("addfox.config.ts");
    expect(CONFIG_FILES).toContain("addfox.config.js");
  });

  it("SCRIPT_EXTS prefers .js before .ts", () => {
    expect(SCRIPT_EXTS[0]).toBe(".js");
    expect(SCRIPT_EXTS).toContain(".ts");
  });

  it("RESERVED_ENTRY_NAMES includes popup, background, content, devtools, sandbox and chrome override entries", () => {
    expect(RESERVED_ENTRY_NAMES).toContain("popup");
    expect(RESERVED_ENTRY_NAMES).toContain("background");
    expect(RESERVED_ENTRY_NAMES).toContain("content");
    expect(RESERVED_ENTRY_NAMES).toContain("devtools");
    expect(RESERVED_ENTRY_NAMES).toContain("sandbox");
    expect(RESERVED_ENTRY_NAMES).toContain("newtab");
    expect(RESERVED_ENTRY_NAMES).toContain("bookmarks");
    expect(RESERVED_ENTRY_NAMES).toContain("history");
  });

  it("HTML_ENTRY_NAMES and SCRIPT_ONLY_ENTRY_NAMES are disjoint", () => {
    const htmlSet = new Set(HTML_ENTRY_NAMES);
    for (const name of SCRIPT_ONLY_ENTRY_NAMES) {
      expect(htmlSet.has(name)).toBe(false);
    }
  });

  it("DEFAULT_OUT_DIR is extension", () => {
    expect(DEFAULT_OUT_DIR).toBe("extension");
  });

  it("ADDFOX_OUTPUT_ROOT is .addfox", () => {
    expect(ADDFOX_OUTPUT_ROOT).toBe(".addfox");
  });

  it("DEFAULT_APP_DIR is app", () => {
    expect(DEFAULT_APP_DIR).toBe("app");
  });

  it("CLI_COMMANDS includes dev, build and test", () => {
    expect(CLI_COMMANDS).toContain("dev");
    expect(CLI_COMMANDS).toContain("build");
    expect(CLI_COMMANDS).toContain("test");
  });

  it("RSTEST_CONFIG_FILES includes rstest.config.ts and rstest.config.mjs", () => {
    expect(RSTEST_CONFIG_FILES).toContain("rstest.config.ts");
    expect(RSTEST_CONFIG_FILES).toContain("rstest.config.mjs");
  });

  it("SUPPORTED_BROWSERS includes chromium and firefox", () => {
    expect(SUPPORTED_BROWSERS).toContain("chromium");
    expect(SUPPORTED_BROWSERS).toContain("firefox");
  });

  it("MANIFEST_ENTRY_PATHS has expected keys", () => {
    expect(MANIFEST_ENTRY_PATHS.background).toBe("background/index.js");
    expect(MANIFEST_ENTRY_PATHS.devtools).toBe("devtools/index.html");
    expect(MANIFEST_ENTRY_PATHS.popup).toBe("popup/index.html");
    expect(MANIFEST_ENTRY_PATHS.sandbox).toBe("sandbox/index.html");
    expect(MANIFEST_ENTRY_PATHS.newtab).toBe("newtab/index.html");
    expect(MANIFEST_ENTRY_PATHS.bookmarks).toBe("bookmarks/index.html");
    expect(MANIFEST_ENTRY_PATHS.history).toBe("history/index.html");
  });

  it("BROWSER_OUTPUT_PREFIX is extension", () => {
    expect(BROWSER_OUTPUT_PREFIX).toBe("extension");
  });

  it("getBrowserOutputDir returns browser-specific directory names", () => {
    expect(getBrowserOutputDir("chromium")).toBe("extension-chromium");
    expect(getBrowserOutputDir("firefox")).toBe("extension-firefox");
  });
});
