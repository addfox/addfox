import { test, expect } from "../fixtures/extension";

test.describe("plugin-extension-monitor", () => {
  test("monitor page is openable (command opens addfox-monitor)", async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await page.goto(
      `chrome-extension://${extensionId}/addfox-monitor/addfox-monitor.html`
    );
    await expect(page).toHaveURL(/addfox-monitor\.html/);
    await expect(page).toHaveTitle("Addfox Monitor");
    await page.close();
  });
});
