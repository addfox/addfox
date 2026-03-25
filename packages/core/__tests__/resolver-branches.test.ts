import { describe, it, expect } from "@rstest/core";
import { resolveEntries, resolveEntriesLegacy } from "../src/entry/resolver.js";
import { AddfoxError } from "@addfox/common";
import * as fs from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";

describe("resolver branches", () => {
  describe("resolveEntriesLegacy", () => {
    it("should return entries array only (legacy API)", async () => {
      const dir = fs.mkdtempSync(path.join(tmpdir(), `addfox-resolver-legacy-${Date.now()}`));
      fs.mkdirSync(path.join(dir, "app", "background"), { recursive: true });
      fs.writeFileSync(path.join(dir, "app", "background", "index.ts"), "// bg", "utf-8");

      const entries = resolveEntriesLegacy({ appDir: "app" }, dir, path.join(dir, "app"));
      expect(Array.isArray(entries)).toBe(true);
      expect(entries.some((e) => e.name === "background")).toBe(true);

      fs.rmSync(dir, { recursive: true, force: true });
    });
  });

  describe("html determination branches", () => {
    it("should handle html=false override", async () => {
      const dir = fs.mkdtempSync(path.join(tmpdir(), `addfox-resolver-html-false-${Date.now()}`));
      fs.mkdirSync(path.join(dir, "app", "popup"), { recursive: true });
      fs.writeFileSync(path.join(dir, "app", "popup", "index.ts"), "// popup", "utf-8");

      const result = resolveEntries(
        { 
          appDir: "app",
          entry: {
            popup: { src: "./popup/index.ts", html: false }
          }
        }, 
        dir, 
        path.join(dir, "app")
      );
      const popup = result.entries.find((e) => e.name === "popup");
      expect(popup).toBeDefined();
      expect(popup?.html).toBe(false);

      fs.rmSync(dir, { recursive: true, force: true });
    });

    it("should handle html=true override", async () => {
      const dir = fs.mkdtempSync(path.join(tmpdir(), `addfox-resolver-html-true-${Date.now()}`));
      fs.mkdirSync(path.join(dir, "app", "custom"), { recursive: true });
      fs.writeFileSync(path.join(dir, "app", "custom", "index.ts"), "// custom", "utf-8");

      const result = resolveEntries(
        { 
          appDir: "app",
          entry: {
            custom: { src: "./custom/index.ts", html: true }
          }
        }, 
        dir, 
        path.join(dir, "app")
      );
      const custom = result.entries.find((e) => e.name === "custom");
      expect(custom).toBeDefined();
      expect(custom?.html).toBe(true);

      fs.rmSync(dir, { recursive: true, force: true });
    });

    it("should use default html determination when html is undefined for popup", async () => {
      const dir = fs.mkdtempSync(path.join(tmpdir(), `addfox-resolver-html-default-${Date.now()}`));
      fs.mkdirSync(path.join(dir, "app", "popup"), { recursive: true });
      fs.writeFileSync(path.join(dir, "app", "popup", "index.ts"), "// popup", "utf-8");

      const result = resolveEntries(
        { 
          appDir: "app",
          entry: {
            popup: { src: "./popup/index.ts" }
          }
        }, 
        dir, 
        path.join(dir, "app")
      );
      const popup = result.entries.find((e) => e.name === "popup");
      expect(popup).toBeDefined();
      // popup is in HTML_ENTRY_NAMES, so html should default to true
      expect(popup?.html).toBe(true);

      fs.rmSync(dir, { recursive: true, force: true });
    });

    it("should throw AddfoxError when entry script from HTML is invalid", async () => {
      const dir = fs.mkdtempSync(path.join(tmpdir(), `addfox-resolver-invalid-html-${Date.now()}`));
      fs.mkdirSync(path.join(dir, "app", "popup"), { recursive: true });
      fs.writeFileSync(
        path.join(dir, "app", "popup", "index.html"),
        '<html><script data-addfox-entry src="./nonexistent.ts"></script></html>',
        "utf-8"
      );
      // Don't create the script file to trigger the error

      expect(() => {
        resolveEntries(
          { 
            appDir: "app",
            entry: {
              popup: { src: "./popup/index.html" }
            }
          }, 
          dir, 
          path.join(dir, "app")
        );
      }).toThrow(AddfoxError);

      fs.rmSync(dir, { recursive: true, force: true });
    });
  });
});
