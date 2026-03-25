import { test as base, chromium, type BrowserContext, type Page } from "@playwright/test";
import path from "path";

const extensionPath =
  process.env.ADDFOX_E2E_EXTENSION_PATH ||
  path.join(process.cwd(), "examples", "addfox-with-react", ".addfox", "extension", "extension-chromium");

const extensionPathWithMonitor =
  process.env.ADDFOX_E2E_EXTENSION_PATH ||
  path.join(process.cwd(), "examples", "addfox-with-react", ".addfox", "extension", "extension-chromium");

export type ExtensionFixtures = {
  context: BrowserContext;
  extensionId: string;
};

export const test = base.extend<ExtensionFixtures>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      headless: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
    // Wait for service worker to be ready
    await context.waitForEvent("serviceworker");
    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent("serviceworker");
    }
    const extensionId = serviceWorker.url().split("/")[2];
    await use(extensionId);
  },
});

export const { expect } = base;

/**
 * Get the path to the built extension
 * @param withMonitor - Whether to get the path with monitor enabled
 */
export function getExtensionPath(withMonitor: boolean = false): string {
  return withMonitor ? extensionPathWithMonitor : extensionPath;
}

/**
 * Load the extension and return the background page
 */
export async function loadExtension(context: BrowserContext, extPath?: string): Promise<Page> {
  const path = extPath || extensionPath;
  
  // Wait for service worker
  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker");
  }
  
  return serviceWorker;
}

/**
 * Get extension ID from context
 */
export async function getExtensionId(context: BrowserContext): Promise<string> {
  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker");
  }
  return serviceWorker.url().split("/")[2];
}
