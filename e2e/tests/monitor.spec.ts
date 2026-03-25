import { test, expect } from "../fixtures/extension";
import fs from "fs";
import path from "path";

const extensionPath =
  process.env.ADDFOX_E2E_EXTENSION_PATH ||
  path.join(process.cwd(), "examples", "addfox-with-react", ".addfox", "extension", "extension-chromium");
const monitorHtmlPath = path.join(extensionPath, "addfox-monitor", "addfox-monitor.html");
const hasMonitor = fs.existsSync(monitorHtmlPath);

test.describe("plugin-extension-monitor", () => {
  test("monitor page is openable (command opens addfox-monitor)", async ({
    context,
    extensionId,
  }) => {
    // Skip if monitor is not built
    test.skip(!hasMonitor, "Monitor not built - run e2e:build:monitor first");
    
    const page = await context.newPage();
    await page.goto(
      `chrome-extension://${extensionId}/addfox-monitor/addfox-monitor.html`
    );
    await expect(page).toHaveURL(/addfox-monitor\.html/);
    await expect(page).toHaveTitle("Addfox Monitor");
    await page.close();
  });
});
