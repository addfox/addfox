import { describe, it, expect, beforeEach, afterEach } from "@rstest/core";
import { launchChromium } from "../src/chromium";
import { launchGecko } from "../src/gecko";
import { findFreePort } from "../src/gecko/rdp";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "node:net";

describe("launcher integration", () => {
  const tmpDir = join(process.cwd(), ".tmp-test-launcher");

  beforeEach(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("launchChromium", () => {
    it("spawns a mock browser without extensions", async () => {
      const mockScript = join(tmpDir, "mock-chrome.js");
      writeFileSync(mockScript, `setInterval(() => {}, 100000);\n`);

      const bp = await launchChromium({
        target: "chrome",
        binaryPath: process.execPath,
        args: [mockScript],
        userDataDir: join(tmpDir, "chrome-data"),
        verbose: false,
      });

      expect(bp.process.pid).toBeGreaterThan(0);
      await bp.exit();
      expect(bp.process.killed || bp.process.exitCode !== null).toBe(true);
    });
  });

  describe("launchGecko", () => {
    beforeEach(() => {
      process.env.ADDFOX_LAUNCHER_TEST_MODE = "1";
    });

    afterEach(() => {
      delete process.env.ADDFOX_LAUNCHER_TEST_MODE;
    });

    it("spawns a mock gecko process without extensions", async () => {
      const mockScript = join(tmpDir, "mock-firefox.js");
      writeFileSync(mockScript, `setInterval(() => {}, 100000);\n`);

      const { process: geckoProcess } = await launchGecko({
        target: "firefox",
        binaryPath: process.execPath,
        args: [mockScript],
        userDataDir: join(tmpDir, "firefox-data"),
        extensionPaths: [],
        verbose: false,
      });

      expect(geckoProcess.process.pid).toBeGreaterThan(0);
      await geckoProcess.exit();
      expect(geckoProcess.process.killed || geckoProcess.process.exitCode !== null).toBe(true);
    });

    it("calls onExit when real browser process exits with non-zero code", async () => {
      if (process.platform !== "win32") {
        return;
      }

      const mockScript = join(tmpDir, "mock-firefox-error.js");
      writeFileSync(mockScript, `setTimeout(() => process.exit(1), 100);\n`);

      let onExitCalled = false;
      const { process: geckoProcess } = await launchGecko({
        target: "firefox",
        binaryPath: process.execPath,
        args: [mockScript],
        userDataDir: join(tmpDir, "firefox-data"),
        extensionPaths: [],
        verbose: false,
        onExit: () => {
          onExitCalled = true;
        },
      });

      await new Promise<void>((resolve) => setTimeout(resolve, 600));
      expect(onExitCalled).toBe(true);
      await geckoProcess.exit();
    });
  });

  describe("findFreePort", () => {
    it("returns a usable free port", async () => {
      const port = await findFreePort();
      expect(typeof port).toBe("number");
      expect(port).toBeGreaterThan(0);

      // Verify the port is actually free by binding to it
      const srv = createServer();
      await new Promise<void>((resolve, reject) => {
        srv.listen(port, "127.0.0.1", () => resolve());
        srv.on("error", reject);
      });
      srv.close();
    });
  });
});
