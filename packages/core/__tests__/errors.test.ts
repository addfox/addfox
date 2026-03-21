import { describe, expect, it } from "@rstest/core";
import {
  AddfoxError,
  ADDFOX_ERROR_CODES,
  createError,
  formatError,
  isAddfoxError,
  exitWithError,
} from "@addfox/common";

describe("errors", () => {
  describe("AddfoxError", () => {
    it("has name and code", () => {
      const err = new AddfoxError({ message: "test", code: ADDFOX_ERROR_CODES.CONFIG_NOT_FOUND });
      expect(err.name).toBe("AddfoxError");
      expect(err.code).toBe("ADDFOX_CONFIG_NOT_FOUND");
      expect(err.message).toBe("test");
    });

    it("accepts details and hint", () => {
      const err = new AddfoxError({
        message: "msg",
        code: ADDFOX_ERROR_CODES.NO_ENTRIES,
        details: "d",
        hint: "h",
      });
      expect(err.details).toBe("d");
      expect(err.hint).toBe("h");
    });
  });

  describe("createError", () => {
    it("creates error with code and message", () => {
      const err = createError("CODE_1", "Message 1");
      expect(err.code).toBe("CODE_1");
      expect(err.message).toBe("Message 1");
    });

    it("creates error with additional options", () => {
      const cause = new Error("Cause");
      const err = createError("CODE_2", "Message 2", {
        details: "Details",
        hint: "Hint",
        cause,
      });
      expect(err.details).toBe("Details");
      expect(err.hint).toBe("Hint");
      expect(err.cause).toBe(cause);
    });
  });

  describe("formatError", () => {
    it("formats AddfoxError using format()", () => {
      const err = new AddfoxError({
        code: "FMT",
        message: "Format test",
        details: "Details",
      });
      const formatted = formatError(err);
      expect(formatted).toContain("[FMT] Format test");
      expect(formatted).toContain("Details");
    });

    it("formats regular Error using stack", () => {
      const err = new Error("Regular error");
      err.stack = "Error: Regular error\n    at test.js:1:1";
      const formatted = formatError(err);
      expect(formatted).toBe(err.stack);
    });
  });

  describe("isAddfoxError", () => {
    it("returns true for AddfoxError instances", () => {
      const err = new AddfoxError({ code: "TEST", message: "Test" });
      expect(isAddfoxError(err)).toBe(true);
    });

    it("returns false for regular Error", () => {
      expect(isAddfoxError(new Error("Regular"))).toBe(false);
    });

    it("returns false for null", () => {
      expect(isAddfoxError(null)).toBe(false);
    });
  });

  describe("AddfoxError cause", () => {
    it("sets cause when provided", () => {
      const cause = new Error("inner");
      const err = new AddfoxError({ message: "outer", code: ADDFOX_ERROR_CODES.BUILD_ERROR, cause });
      expect(err.cause).toBe(cause);
    });
  });

  describe("exitWithError", () => {
    const noop = () => {};

    it("calls process.exit(1) and does not return", () => {
      const exit = process.exit;
      const logErr = console.error;
      console.error = noop;
      let exitCode: number | undefined;
      process.exit = ((code?: number) => {
        exitCode = code;
        throw new Error("exit");
      }) as typeof process.exit;
      try {
        expect(() => exitWithError(new AddfoxError({ message: "e", code: ADDFOX_ERROR_CODES.BUILD_ERROR }))).toThrow("exit");
        expect(exitCode).toBe(1);
      } finally {
        process.exit = exit;
        console.error = logErr;
      }
    });

    it("formats non-Error via String()", () => {
      const exit = process.exit;
      const logErr = console.error;
      console.error = noop;
      let exitCode: number | undefined;
      process.exit = ((code?: number) => {
        exitCode = code;
        throw new Error("exit");
      }) as typeof process.exit;
      try {
        expect(() => exitWithError("string error")).toThrow("exit");
        expect(exitCode).toBe(1);
      } finally {
        process.exit = exit;
        console.error = logErr;
      }
    });

    it("formats plain Error with stack", () => {
      const exit = process.exit;
      const logErr = console.error;
      console.error = noop;
      process.exit = (() => {
        throw new Error("exit");
      }) as typeof process.exit;
      try {
        expect(() => exitWithError(new Error("plain"))).toThrow("exit");
      } finally {
        process.exit = exit;
        console.error = logErr;
      }
    });

    it("exits with code 1 without logging (logging is caller responsibility)", () => {
      const exit = process.exit;
      process.exit = (() => {
        throw new Error("exit");
      }) as typeof process.exit;
      try {
        const err = new AddfoxError({
          code: ADDFOX_ERROR_CODES.CONFIG_NOT_FOUND,
          message: "Config not found",
          details: "No config found under /root",
        });
        expect(() => exitWithError(err)).toThrow("exit");
      } finally {
        process.exit = exit;
      }
    });
  });
});
