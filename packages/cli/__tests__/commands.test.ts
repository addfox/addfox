import { describe, expect, it } from "@rstest/core";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { ADDFOX_ERROR_CODES } from "@addfox/common";

import {
  runTest,
  resolveTestConfig,
  writeGeneratedRstestConfig,
  isBrowserEnabledFromTestField,
} from "../src/commands/test.ts";

function makeRoot(): string {
  return mkdtempSync(join(tmpdir(), "addfox-cli-runTest-"));
}

function writeAddfoxConfig(root: string, body: string): void {
  writeFileSync(join(root, "addfox.config.mjs"), body, "utf-8");
}

describe("cli commands", () => {
  it("runTest throws when rstest config is missing", async () => {
    const root = makeRoot();
    try {
      await expect(runTest(root, ["node", "rstest", "run"])).rejects.toBeInstanceOf(
        Error
      );
      try {
        await runTest(root, ["node", "rstest", "run"]);
        // eslint-disable-next-line no-unreachable
        throw new Error("should not reach");
      } catch (err) {
        expect((err as any)?.code).toBe(
          ADDFOX_ERROR_CODES.RSTEST_CONFIG_NOT_FOUND
        );
        expect((err as any)?.hint).toContain("test");
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("resolveTestConfig", () => {
  it("returns mode none when neither rstest.config nor test field exists", () => {
    const root = makeRoot();
    try {
      expect(resolveTestConfig(root).mode).toBe("none");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns mode testField when addfox.config has a test field", () => {
    const root = makeRoot();
    try {
      writeAddfoxConfig(root, "export default { test: { globals: true } };\n");
      const resolution = resolveTestConfig(root);
      expect(resolution.mode).toBe("testField");
      if (resolution.mode === "testField") {
        expect(resolution.testField.globals).toBe(true);
        expect(resolution.addfoxConfigPath).toContain("addfox.config.mjs");
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rstest.config file takes precedence over the test field", () => {
    const root = makeRoot();
    try {
      writeAddfoxConfig(root, "export default { test: { globals: true } };\n");
      writeFileSync(join(root, "rstest.config.ts"), "export default {};\n", "utf-8");
      const resolution = resolveTestConfig(root);
      expect(resolution.mode).toBe("configFile");
      if (resolution.mode === "configFile") {
        expect(resolution.configPath).toContain("rstest.config.ts");
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("throws INVALID_ARGUMENT for an unsupported framework", () => {
    const root = makeRoot();
    try {
      writeAddfoxConfig(root, 'export default { test: { framework: "vitest" } };\n');
      try {
        resolveTestConfig(root);
        throw new Error("should not reach");
      } catch (err) {
        expect((err as any)?.code).toBe(ADDFOX_ERROR_CODES.INVALID_ARGUMENT);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("writeGeneratedRstestConfig", () => {
  it("generates a wrapper config that strips framework and sets root", () => {
    const root = makeRoot();
    try {
      const addfoxConfigPath = join(root, "addfox.config.mjs");
      writeFileSync(addfoxConfigPath, "export default {};\n", "utf-8");
      const outPath = writeGeneratedRstestConfig(root, addfoxConfigPath);
      expect(outPath).toContain(".addfox");
      expect(existsSync(outPath)).toBe(true);
      const content = readFileSync(outPath, "utf-8");
      expect(content).toContain('import addfoxConfig from "../addfox.config.mjs"');
      expect(content).toContain("framework: _framework");
      expect(content).toContain(`root: ${JSON.stringify(root)}`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("isBrowserEnabledFromTestField", () => {
  it("detects browser.enabled from the live test field object", () => {
    expect(isBrowserEnabledFromTestField({ browser: { enabled: true } } as any)).toBe(true);
    expect(isBrowserEnabledFromTestField({ browser: { enabled: false } } as any)).toBe(false);
    expect(isBrowserEnabledFromTestField({} as any)).toBe(false);
  });
});
