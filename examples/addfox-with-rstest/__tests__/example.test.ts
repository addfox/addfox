import { describe, expect, it } from "@rstest/core";

describe("example unit tests", () => {
  it("adds numbers", () => {
    expect(1 + 2).toBe(3);
  });

  it("runs in node env", () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });
});
