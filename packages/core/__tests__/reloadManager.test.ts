import { describe, expect, it } from "@rstest/core";

import { toReloadManagerEntries } from "../src/reloadManager.ts";

describe("toReloadManagerEntries", () => {
  it("filters entries to background/content only and resolves script paths", () => {
    const root = "/proj";
    const entries = [
      { name: "background", scriptPath: "app/background/index.ts" },
      { name: "content", scriptPath: "app/content/index.ts" },
      { name: "popup", scriptPath: "app/popup/index.ts" },
    ] as any;

    const out = toReloadManagerEntries(entries, root);
    expect(out.map((e) => e.name).sort()).toEqual(["background", "content"]);
    const normalize = (p: string): string => p.replace(/\\/g, "/");
    expect(
      out.some((e) => normalize(e.path).endsWith("app/background/index.ts"))
    ).toBe(true);
    expect(
      out.some((e) => normalize(e.path).endsWith("app/content/index.ts"))
    ).toBe(true);
    expect(out.some((e) => e.path.includes("popup"))).toBe(false);
  });
});

