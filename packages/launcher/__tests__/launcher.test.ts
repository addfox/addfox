import { describe, it, expect } from "@rstest/core";
import { launchBrowser } from "../src/launcher";
import { isChromium, isGecko } from "../src/paths";

describe("launcher", () => {
  it("exports launchBrowser", () => {
    expect(typeof launchBrowser).toBe("function");
  });

  it("exports path helpers", () => {
    expect(typeof isChromium).toBe("function");
    expect(typeof isGecko).toBe("function");
  });

  it("throws for unsupported target", async () => {
    await expect(
      launchBrowser({
        target: "unknown" as any,
        extensionPaths: [],
      }),
    ).rejects.toThrow("Unsupported browser target");
  });
});
