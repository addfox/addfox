import { test as base, chromium, type Browser } from "@playwright/test";
import { launchBrowser, type BrowserProcess } from "@addfox/launcher";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_EXTENSION_PATH = path.resolve(__dirname, "test-extension");

function waitForCdpEndpoint(port: number, timeout = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;
    const tryConnect = () => {
      const req = http.get(`http://localhost:${port}/json/version`, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          retry();
        }
      });
      req.on("error", retry);
    };
    const retry = () => {
      if (Date.now() > deadline) {
        reject(new Error(`CDP endpoint not available on port ${port} after ${timeout}ms`));
        return;
      }
      setTimeout(tryConnect, 200);
    };
    tryConnect();
  });
}

export type LauncherFixtures = {
  launcherProcess: BrowserProcess;
  browser: Browser;
  extensionId: string;
};

export const test = base.extend<LauncherFixtures>({
  launcherProcess: [async ({}, use, testInfo) => {
    const port = 9200 + testInfo.workerIndex;
    const process = await launchBrowser({
      target: "chrome",
      extensionPaths: [TEST_EXTENSION_PATH],
      remoteDebuggingPort: port,
      startUrl: "about:blank",
      args: ["--headless=new"],
    });
    await waitForCdpEndpoint(port);
    await use(process);
    await process.exit();
  }, { scope: "worker" }],

  browser: async ({ launcherProcess }, use, testInfo) => {
    const port = 9200 + testInfo.workerIndex;
    const browser = await chromium.connectOverCDP(`http://localhost:${port}`);
    await use(browser);
    await browser.close();
  },

  extensionId: async ({ browser }, use) => {
    const context = browser.contexts()[0];
    let [sw] = context.serviceWorkers();
    if (!sw) {
      sw = await context.waitForEvent("serviceworker", { timeout: 10000 });
    }
    const extensionId = sw.url().split("/")[2];
    await use(extensionId);
  },
});

export const { expect } = base;
