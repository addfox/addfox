import { describe, expect, it } from "@rstest/core";
import {
  CliParser,
  parseCliArgs,
  assertSupportedBrowser,
} from "../src/cli/args.ts";
import { AddfoxError, ADDFOX_ERROR_CODES } from "@addfox/common";

describe("CliParser", () => {
  const parser = new CliParser();

  describe("parse", () => {
    it("parses dev as default command", () => {
      const r = parseCliArgs(["dev"]);
      expect(r.command).toBe("dev");
      expect(r.browser).toBeUndefined();
    });

    it("parses build command", () => {
      const r = parseCliArgs(["build"]);
      expect(r.command).toBe("build");
    });

    it("parses -b chromium / -b firefox", () => {
      const r1 = parseCliArgs(["build", "-b", "chromium"]);
      expect(r1.browser).toBe("chromium");
      expect(r1.launch).toBe("chromium");
      const r2 = parseCliArgs(["build", "--browser=firefox"]);
      expect(r2.browser).toBe("firefox");
      expect(r2.launch).toBe("firefox");
    });

    it("maps chrome/brave/edge/etc to chromium but preserves launch target", () => {
      const r1 = parseCliArgs(["build", "-b", "chrome"]);
      expect(r1.browser).toBe("chromium");
      expect(r1.launch).toBe("chrome");
      const r2 = parseCliArgs(["build", "-b", "edge"]);
      expect(r2.browser).toBe("chromium");
      expect(r2.launch).toBe("edge");
      const r3 = parseCliArgs(["build", "-b", "brave"]);
      expect(r3.browser).toBe("chromium");
      expect(r3.launch).toBe("brave");
    });

    it("parses -c/--cache", () => {
      const r = parseCliArgs(["build", "-c"]);
      expect(r.cache).toBe(true);
      const r2 = parseCliArgs(["build", "--cache"]);
      expect(r2.cache).toBe(true);
    });

    it("parses --no-cache", () => {
      const r = parseCliArgs(["build", "--no-cache"]);
      expect(r.cache).toBe(false);
    });

    it("uses last cache flag when both cache flags are present", () => {
      const r1 = parseCliArgs(["build", "--cache", "--no-cache"]);
      expect(r1.cache).toBe(false);
      const r2 = parseCliArgs(["build", "--no-cache", "--cache"]);
      expect(r2.cache).toBe(true);
    });

    it("does not force cache=false when --cache is omitted", () => {
      const r = parseCliArgs(["build"]);
      expect(r.cache).toBeUndefined();
    });

    it("parses --debug", () => {
      const r = parseCliArgs(["dev", "--debug"]);
      expect(r.debug).toBe(true);
      const r2 = parseCliArgs(["build"]);
      expect(r2.debug).toBeUndefined();
    });

    it("parses -r/--report", () => {
      const r = parseCliArgs(["build", "-r"]);
      expect(r.report).toBe(true);
      const r2 = parseCliArgs(["build", "--report"]);
      expect(r2.report).toBe(true);
      const r3 = parseCliArgs(["dev"]);
      expect(r3.report).toBeUndefined();
    });

    it("parses --no-open", () => {
      const r = parseCliArgs(["build", "--no-open"]);
      expect(r.open).toBe(false);
      const r2 = parseCliArgs(["dev"]);
      expect(r2.open).toBe(true);
      const r3 = parseCliArgs(["dev", "--no-open"]);
      expect(r3.open).toBe(false);
    });

    it("returns unknownBrowser when -b value is invalid", () => {
      const r = parseCliArgs(["build", "-b", "safari"]);
      expect(r.browser).toBeUndefined();
      expect(r.unknownBrowser).toBe("safari");
    });

    it("returns unknownBrowser for -b=invalid form", () => {
      const r = parseCliArgs(["build", "-b=unknown"]);
      expect(r.browser).toBeUndefined();
      expect(r.unknownBrowser).toBe("unknown");
    });

    it("parses -b=firefox (short equals format)", () => {
      const r = parseCliArgs(["dev", "-b=firefox"]);
      expect(r.browser).toBe("firefox");
    });

    it("parses --browser=chromium (long equals format)", () => {
      const r = parseCliArgs(["build", "--browser=chromium"]);
      expect(r.browser).toBe("chromium");
    });

    it("throws on unknown command", () => {
      expect(() => parseCliArgs(["unknown"])).toThrow(AddfoxError);
      try {
        parseCliArgs(["unknown"]);
      } catch (e) {
        expect((e as AddfoxError).code).toBe(ADDFOX_ERROR_CODES.UNKNOWN_COMMAND);
        expect((e as AddfoxError).details).toContain("unknown");
      }
    });

    it("throws on invalid browser via assertSupportedBrowser", () => {
      expect(() => assertSupportedBrowser("safari")).toThrow(AddfoxError);
      try {
        assertSupportedBrowser("safari");
      } catch (e) {
        expect((e as AddfoxError).code).toBe(ADDFOX_ERROR_CODES.INVALID_BROWSER);
        expect((e as AddfoxError).details).toContain("safari");
      }
    });

    it("accepts valid browsers via assertSupportedBrowser", () => {
      expect(() => assertSupportedBrowser("chromium")).not.toThrow();
      expect(() => assertSupportedBrowser("chrome")).not.toThrow();
      expect(() => assertSupportedBrowser("firefox")).not.toThrow();
    });
  });
});
