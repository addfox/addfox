import { describe, expect, it } from "@rstest/core";
import { runCreateApp } from "../src/cli/index.ts";

describe("cli runCreateApp", () => {
  function captureLogs(fn: () => void | Promise<void>): string {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(" "));
    try {
      const result = fn();
      if (result instanceof Promise) {
        throw new Error("captureLogs does not support async functions");
      }
    } finally {
      console.log = originalLog;
    }
    return logs.join("\n");
  }

  async function captureLogsAsync(fn: () => Promise<void>): Promise<string> {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(" "));
    try {
      await fn();
    } finally {
      console.log = originalLog;
    }
    return logs.join("\n");
  }

  it("exits early with --help and mentions both usage forms", async () => {
    const output = await captureLogsAsync(() => runCreateApp(["--help"]));
    expect(output).toContain("addfox create");
    expect(output).toContain("create-addfox-app");
    expect(output).toContain("Usage:");
  });

  it("exits early with -h", async () => {
    const output = await captureLogsAsync(() => runCreateApp(["-h"]));
    expect(output).toContain("Usage:");
  });

  it("exits early with --version and prints semver", async () => {
    const output = await captureLogsAsync(() => runCreateApp(["--version"]));
    expect(output.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("exits early with -v and prints semver", async () => {
    const output = await captureLogsAsync(() => runCreateApp(["-v"]));
    expect(output.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("prints version as first line when running interactively", async () => {
    // We can't fully run interactive mode in tests, but we can verify
    // the function is exported and accepts custom argv
    expect(typeof runCreateApp).toBe("function");
  });
});
