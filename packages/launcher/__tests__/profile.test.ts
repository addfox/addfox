import { describe, it, expect, beforeEach, afterEach } from "@rstest/core";
import { createGeckoProfile, installExtensionsToProfile } from "../src/gecko/profile";
import { mkdtempSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("gecko profile", () => {
  let profileDir: string;

  beforeEach(() => {
    profileDir = mkdtempSync(join(tmpdir(), "gecko-profile-"));
  });

  afterEach(() => {
    // tmp dirs are left for OS cleanup
  });

  describe("createGeckoProfile", () => {
    it("creates user.js with required prefs", () => {
      createGeckoProfile(profileDir);
      const userJs = join(profileDir, "user.js");
      expect(existsSync(userJs)).toBe(true);

      const content = readFileSync(userJs, "utf8");
      expect(content).toContain("xpinstall.signatures.required");
      expect(content).toContain("false");
      expect(content).toContain("devtools.debugger.remote-enabled");
      expect(content).toContain("true");
    });

    it("disables updates and telemetry", () => {
      createGeckoProfile(profileDir);
      const content = readFileSync(join(profileDir, "user.js"), "utf8");
      expect(content).toContain("app.update.auto");
      expect(content).toContain("toolkit.telemetry.enabled");
      expect(content).toContain("datareporting.healthreport.uploadEnabled");
    });
  });

  describe("installExtensionsToProfile", () => {
    it("creates extensions directory", () => {
      const extDir = join(tmpdir(), `fake-ext-${Date.now()}`);
      mkdirSync(extDir, { recursive: true });
      installExtensionsToProfile(profileDir, [extDir]);
      expect(existsSync(join(profileDir, "extensions"))).toBe(true);
    });
  });
});
