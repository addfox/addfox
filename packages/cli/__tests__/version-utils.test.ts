import { describe, expect, it } from "@rstest/core";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { getVersion, getRsbuildVersion } from "../src/utils/version.ts";

describe("cli utils/version", () => {
  it("getVersion returns a non-empty CLI version", () => {
    const v = getVersion();
    expect(typeof v).toBe("string");
    expect(v.length).toBeGreaterThan(0);
  });

  it("getRsbuildVersion resolves @rsbuild/core version from monorepo", () => {
    const root = mkdtempSync(join(tmpdir(), "addfox-cli-version-"));
    try {
      const v = getRsbuildVersion(root);
      expect(typeof v).toBe("string");
      expect(v).not.toBe("?");
      expect(v.length).toBeGreaterThan(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

