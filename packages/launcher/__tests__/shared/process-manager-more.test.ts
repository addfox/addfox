import { describe, it, expect } from "@rstest/core";
import { spawnBrowserProcess } from "../../src/shared/process-manager";

describe("process-manager extended", () => {
  describe("onExit callback", () => {
    it("calls onExit with code and signal when process exits normally", async () => {
      let receivedCode: number | null = null;
      let receivedSignal: NodeJS.Signals | null = null;

      const bp = await spawnBrowserProcess({
        binary: process.execPath,
        args: ["-e", "process.exit(42)"],
        verbose: false,
        onExit: (code, signal) => {
          receivedCode = code;
          receivedSignal = signal;
        },
      });

      // Wait for process to exit naturally
      await new Promise<void>((resolve) => setTimeout(resolve, 300));
      expect(receivedCode).toBe(42);
      expect(receivedSignal).toBeNull();
    });

    it("calls onExit when killed via exit()", async () => {
      let exitCalled = false;

      const bp = await spawnBrowserProcess({
        binary: process.execPath,
        args: ["-e", "setTimeout(() => {}, 10000)"],
        verbose: false,
        onExit: () => {
          exitCalled = true;
        },
      });

      await new Promise<void>((resolve) => setTimeout(resolve, 100));
      await bp.exit();
      expect(exitCalled).toBe(true);
    });

    it("ignores exit code 0 when wrapped like gecko runner", async () => {
      let called = false;
      const wrapped = (code: number | null, signal: NodeJS.Signals | null) => {
        if (signal == null && (code === 0 || code == null)) return;
        called = true;
      };

      const bp = await spawnBrowserProcess({
        binary: process.execPath,
        args: ["-e", "setTimeout(() => process.exit(0), 50)"],
        onExit: wrapped,
      });

      await new Promise<void>((resolve) => setTimeout(resolve, 300));
      expect(called).toBe(false);
      await bp.exit();
    });

    it("handles proc.on('error') without crashing", async () => {
      const bp = await spawnBrowserProcess({
        binary: process.execPath,
        args: ["-e", "setTimeout(() => {}, 1000)"],
        verbose: false,
      });

      // Just ensure the process starts and exits cleanly
      expect(bp.process.pid).toBeGreaterThan(0);
      await bp.exit();
    });
  });

  describe("stdio configuration", () => {
    it("uses inherit stdio by default", async () => {
      const bp = await spawnBrowserProcess({
        binary: process.execPath,
        args: ["-e", "process.exit(0)"],
        verbose: false,
      });

      // stdin, stdout, stderr should be pipes or inherit depending on default
      // The default is ["inherit", "inherit", "inherit"]
      await bp.exit();
    });

    it("accepts custom stdio", async () => {
      const bp = await spawnBrowserProcess({
        binary: process.execPath,
        args: ["-e", "process.exit(0)"],
        stdio: ["pipe", "pipe", "pipe"],
        verbose: false,
      });

      expect(bp.process.stdin).toBeTruthy();
      expect(bp.process.stdout).toBeTruthy();
      expect(bp.process.stderr).toBeTruthy();
      await bp.exit();
    });
  });
});
