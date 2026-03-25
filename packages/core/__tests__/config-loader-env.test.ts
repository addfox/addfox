import { describe, it, expect, beforeEach, afterEach } from "@rstest/core";
import * as fs from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";

describe("config loader environment handling", () => {
  const originalEnv = process.env.ADDFOX_CONFIG_RESTART;
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), "addfox-config-env-"));
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.ADDFOX_CONFIG_RESTART;
    } else {
      process.env.ADDFOX_CONFIG_RESTART = originalEnv;
    }
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should handle ADDFOX_CONFIG_RESTART=1 when loading config", async () => {
    process.env.ADDFOX_CONFIG_RESTART = "1";
    
    // Create a config file
    fs.writeFileSync(
      path.join(testDir, "addfox.config.ts"),
      `export default { name: 'restart-test' };`
    );

    // Import fresh module with env set
    const { loadConfigFile } = await import("../src/config/loader.js");
    const result = loadConfigFile(testDir);
    
    expect(result).toMatchObject({ name: "restart-test" });
  });

  it("should handle ADDFOX_CONFIG_RESTART=0 when loading config", async () => {
    process.env.ADDFOX_CONFIG_RESTART = "0";
    
    fs.writeFileSync(
      path.join(testDir, "addfox.config.ts"),
      `export default { name: 'no-restart-test' };`
    );

    const { loadConfigFile } = await import("../src/config/loader.js");
    const result = loadConfigFile(testDir);
    
    expect(result).toMatchObject({ name: "no-restart-test" });
  });

  it("should handle undefined ADDFOX_CONFIG_RESTART", async () => {
    delete process.env.ADDFOX_CONFIG_RESTART;
    
    fs.writeFileSync(
      path.join(testDir, "addfox.config.ts"),
      `export default { name: 'default-test' };`
    );

    const { loadConfigFile } = await import("../src/config/loader.js");
    const result = loadConfigFile(testDir);
    
    expect(result).toMatchObject({ name: "default-test" });
  });

  it("should load .mjs config file", async () => {
    fs.writeFileSync(
      path.join(testDir, "addfox.config.mjs"),
      `export default { format: 'esm' };`
    );

    const { loadConfigFile } = await import("../src/config/loader.js");
    const result = loadConfigFile(testDir);
    
    expect(result).toMatchObject({ format: "esm" });
  });

  it("should load .js config file with module.exports", async () => {
    fs.writeFileSync(
      path.join(testDir, "addfox.config.js"),
      `module.exports = { format: 'cjs' };`
    );

    const { loadConfigFile } = await import("../src/config/loader.js");
    const result = loadConfigFile(testDir);
    
    expect(result).toMatchObject({ format: "cjs" });
  });
});
