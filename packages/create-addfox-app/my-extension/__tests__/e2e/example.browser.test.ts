import { describe, expect, it } from "@rstest/core";
import { page } from "@rstest/browser";

describe("E2E browser tests", () => {
  it("asserts element in document", async () => {
    document.body.innerHTML = `<button id="btn">Click me</button>`;
    await expect
      .element(page.getByRole("button", { name: "Click me" }))
      .toBeVisible();
  });
});
