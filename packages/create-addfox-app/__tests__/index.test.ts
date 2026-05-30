import { describe, expect, it } from "@rstest/core";
import { runCreateApp } from "../src/index.ts";

describe("index exports", () => {
  it("exports runCreateApp as a function", () => {
    expect(typeof runCreateApp).toBe("function");
  });
});
