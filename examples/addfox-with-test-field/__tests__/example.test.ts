import { describe, expect, it } from "@rstest/core";

import { add } from "../app/shared/math";

describe("example unit tests (configured via addfox.config test field)", () => {
  it("adds numbers", () => {
    expect(add(1, 2)).toBe(3);
  });

  it("runs in node env", () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });
});
