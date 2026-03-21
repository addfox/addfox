import { describe, expect, it } from "@rstest/core";

import { Pipeline } from "../src/pipeline/Pipeline.ts";

describe("Pipeline", () => {
  it("executes before/after hooks for all stages and returns final context", async () => {
    const calls: Array<{ stage: string; when: "before" | "after" }> = [];
    const hooks = {
      execute: async (stage: string, when: string) => {
        calls.push({ stage, when: when as "before" | "after" });
      },
    };

    const pipeline = new Pipeline(hooks as never);
    const ctx = await pipeline.execute("root", ["build"]);

    expect(ctx.root).toBe("root");
    expect(ctx.argv).toEqual(["build"]);

    const stages = ["init", "options", "parse", "load", "resolve", "prepare", "build"];
    const expected = [...stages, "complete"];
    expect(calls.length).toBe(expected.length * 2);

    for (const stage of expected) {
      expect(calls.filter((c) => c.stage === stage).length).toBe(2);
    }
  });

  it("runs complete stage hooks on error and rethrows", async () => {
    const calls: string[] = [];
    const hooks = {
      execute: async (stage: string, when: string) => {
        calls.push(`${stage}:${when}`);
        if (stage === "parse" && when === "before") {
          throw new Error("boom");
        }
      },
    };

    const pipeline = new Pipeline(hooks as never);
    await expect(pipeline.execute("root", ["build"])).rejects.toThrow("boom");

    expect(calls.includes("complete:before")).toBe(true);
    expect(calls.includes("complete:after")).toBe(true);

    expect(calls.some((c) => c.startsWith("load:"))).toBe(false);
  });
});

