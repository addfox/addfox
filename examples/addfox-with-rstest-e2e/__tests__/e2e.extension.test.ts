import { describe, expect, it } from "@rstest/core";
import { chromium } from "playwright";
import { resolve } from "path";
import { existsSync } from "fs";

const EXTENSION_OUTPUT = resolve(process.cwd(), ".addfox", "extension");

describe("E2E extension tests", () => {
  it("loads extension and opens popup", async () => {
    if (!existsSync(EXTENSION_OUTPUT)) {
      throw new Error(
        `Extension not built at ${EXTENSION_OUTPUT}. Run "addfox build" or "pnpm test" (runs pretest).`
      );
    }

    const userDataDir = resolve(process.cwd(), ".addfox", "e2e-user-data");
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: "chromium",
      headless: true,
      args: [
        `--disable-extensions-except=${EXTENSION_OUTPUT}`,
        `--load-extension=${EXTENSION_OUTPUT}`,
      ],
    });

    try {
      let [serviceWorker] = context.serviceWorkers();
      if (!serviceWorker) {
        serviceWorker = await context.waitForEvent("serviceworker", { timeout: 10000 });
      }
      const extensionId = serviceWorker.url().split("/")[2];
      expect(extensionId).toBeDefined();
      expect(extensionId.length).toBeGreaterThan(0);

      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/popup/index.html`, {
        waitUntil: "domcontentloaded",
      });

      const bodyText = await page.locator("body").textContent();
      expect(bodyText).to.include("Rstest E2E example");
    } finally {
      await context.close();
    }
  });
});
