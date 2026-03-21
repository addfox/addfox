import { describe, expect, it } from "@rstest/core";
import { readFileSync } from "fs";
import { resolve } from "path";

import { getAddfoxVersion } from "../src/version.ts";

describe("getAddfoxVersion", () => {
  it("returns version from packages/core/package.json", () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf-8")) as {
      version?: string;
    };
    expect(typeof pkg.version).toBe("string");
    expect(getAddfoxVersion()).toBe(pkg.version);
  });
});

