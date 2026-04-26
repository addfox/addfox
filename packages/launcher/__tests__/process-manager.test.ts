import { describe, it, expect } from "@rstest/core";
import { createTempProfile, guessDefaultProfileDir, spawnBrowserProcess } from "../src/shared/process-manager";
import { existsSync, statSync } from "node:fs";

describe("process-manager", () => {
  describe("createTempProfile", () => {
    it("creates a directory", () => {
      const dir = createTempProfile("test");
      expect(existsSync(dir)).toBe(true);
      expect(statSync(dir).isDirectory()).toBe(true);
    });

    it("includes prefix in path", () => {
      const dir = createTempProfile("chromium");
      expect(dir).toContain("addfox-launcher-chromium-");
    });
  });

  describe("guessDefaultProfileDir", () => {
    it("returns a path for chromium on win32", () => {
      const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");
      Object.defineProperty(process, "platform", { value: "win32" });
      const originalLocalAppData = process.env.LOCALAPPDATA;
      process.env.LOCALAPPDATA = "C:\\Users\\Test\\AppData\\Local";

      const dir = guessDefaultProfileDir("Chromium");
      expect(dir).toContain("Chromium");
      expect(dir).toContain("User Data");

      Object.defineProperty(process, "platform", originalPlatform!);
      process.env.LOCALAPPDATA = originalLocalAppData;
    });

    it("returns null when no home directory", () => {
      const originalHome = process.env.HOME;
      const originalUserProfile = process.env.USERPROFILE;
      delete process.env.HOME;
      delete process.env.USERPROFILE;

      expect(guessDefaultProfileDir("Chrome")).toBeNull();

      if (originalHome) process.env.HOME = originalHome;
      if (originalUserProfile) process.env.USERPROFILE = originalUserProfile;
    });
  });

  describe("spawnBrowserProcess", () => {
    it("spawns a node process and can exit it", async () => {
      const bp = await spawnBrowserProcess({
        binary: process.execPath,
        args: ["-e", "setTimeout(() => {}, 5000)"],
        verbose: false,
      });

      expect(bp.process.pid).toBeGreaterThan(0);
      await bp.exit();
      expect(bp.process.killed).toBe(true);
    });
  });
});
