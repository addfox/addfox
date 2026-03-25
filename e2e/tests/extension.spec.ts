import { test, expect } from "../fixtures/extension";

test.describe("addfox React template extension", () => {
  test("popup page loads and shows title", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h2")).toHaveText("React Popup");
    await expect(page.getByText("Idle")).toBeVisible();
  });

  test("popup Ping Background button works", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Ping Background" }).click();
    await expect(page.getByText("Background OK")).toBeVisible({ timeout: 5000 });
  });

  test("options page loads and shows content", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options/index.html`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toHaveText("Options");
  });
});
