import { describe, expect, it } from "@rstest/core";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import {
  collectHotUpdateAssetNames,
  removeStaleHotUpdateFiles,
  clearOutdatedHotUpdateFiles,
} from "../src/hmr/cleanup.ts";

describe("hmr cleanup", () => {
  it("collectHotUpdateAssetNames collects .hot-update. assets only", () => {
    const set = collectHotUpdateAssetNames([
      {
        toJson: () => ({
          assets: [
            { name: "app.hot-update.js" },
            { name: "keep.hot-update.css" },
            { name: "main.js" },
          ],
        }),
      },
    ]);
    expect(set.has("app.hot-update.js")).toBe(true);
    expect(set.has("keep.hot-update.css")).toBe(true);
    expect(set.has("main.js")).toBe(false);
  });

  it("removeStaleHotUpdateFiles removes stale .hot-update. files recursively", async () => {
    const root = mkdtempSync(join(tmpdir(), "addfox-hmr-cleanup-"));
    const nested = join(root, "nested");
    mkdirSync(nested, { recursive: true });

    const keep = join(root, "keep.hot-update.js");
    const stale = join(root, "stale.hot-update.js");
    const staleNested = join(nested, "stale-nested.hot-update.js");

    writeFileSync(keep, "keep", "utf-8");
    writeFileSync(stale, "stale", "utf-8");
    writeFileSync(staleNested, "stale", "utf-8");

    try {
      await removeStaleHotUpdateFiles(root, new Set(["keep.hot-update.js"]));
      expect(existsSync(keep)).toBe(true);
      expect(existsSync(stale)).toBe(false);
      expect(existsSync(staleNested)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("clearOutdatedHotUpdateFiles returns early when distPath is empty", async () => {
    await expect(
      clearOutdatedHotUpdateFiles("", {
        hasErrors: () => false,
      })
    ).resolves.toBeUndefined();
  });

  it("clearOutdatedHotUpdateFiles removes stale files based on stats assets", async () => {
    const root = mkdtempSync(join(tmpdir(), "addfox-hmr-clear-"));
    const keep = join(root, "keep.hot-update.js");
    const stale = join(root, "stale.hot-update.js");
    writeFileSync(keep, "keep", "utf-8");
    writeFileSync(stale, "stale", "utf-8");

    try {
      await clearOutdatedHotUpdateFiles(root, {
        hasErrors: () => false,
        stats: [
          {
            toJson: () => ({
              assets: [{ name: "keep.hot-update.js" }],
            }),
          },
        ],
      });

      expect(existsSync(keep)).toBe(true);
      expect(existsSync(stale)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

