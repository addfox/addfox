import { describe, expect, it } from "@rstest/core";
import { mergeRsbuildConfig } from "@rsbuild/core";
import type { RsbuildConfig } from "@rsbuild/core";

describe("mergeRsbuildConfig", () => {
  it("concatenates plugins (base then user)", () => {
    const base: RsbuildConfig = { plugins: [{ name: "a" }] as RsbuildConfig["plugins"] };
    const user: RsbuildConfig = { plugins: [{ name: "b" }] as RsbuildConfig["plugins"] };
    const merged = mergeRsbuildConfig(base, user);
    expect(merged.plugins).toHaveLength(2);
    expect((merged.plugins as { name: string }[])[0].name).toBe("a");
    expect((merged.plugins as { name: string }[])[1].name).toBe("b");
  });

  it("deep-merges plain objects with user winning", () => {
    const base: RsbuildConfig = {
      source: { entry: { index: "src/index.ts" }, define: { FOO: "1" } },
    } as RsbuildConfig;
    const user: RsbuildConfig = {
      source: { define: { BAR: "2" } },
    } as RsbuildConfig;
    const merged = mergeRsbuildConfig(base, user);
    expect(merged.source?.entry).toEqual({ index: "src/index.ts" });
    expect((merged.source as { define?: Record<string, string> }).define).toEqual({
      FOO: "1",
      BAR: "2",
    });
  });

  it("overwrites non-object user values", () => {
    const base: RsbuildConfig = { root: "/base" } as RsbuildConfig;
    const user: RsbuildConfig = { root: "/user" } as RsbuildConfig;
    const merged = mergeRsbuildConfig(base, user);
    expect(merged.root).toBe("/user");
  });

  it("leaves base keys unchanged when user has undefined", () => {
    const base: RsbuildConfig = { root: "/base" } as RsbuildConfig;
    const user: RsbuildConfig = {};
    const merged = mergeRsbuildConfig(base, user);
    expect(merged.root).toBe("/base");
  });
});
