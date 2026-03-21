import { describe, expect, it } from "@rstest/core";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { ADDFOX_ERROR_CODES } from "@addfox/common";

import { runTest } from "../src/commands/test.ts";

describe("cli commands", () => {
  it("runTest throws when rstest config is missing", async () => {
    const root = mkdtempSync(join(tmpdir(), "addfox-cli-runTest-"));
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
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

