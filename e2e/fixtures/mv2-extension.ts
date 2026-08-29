import { test as base, chromium, type BrowserContext, type Page } from "@playwright/test";
import path from "path";

const extensionPath =
  process.env.ADDFOX_E2E_MV2_EXTENSION_PATH ||
  path.join(process.cwd(), "examples", "addfox-with-mv2", ".addfox", "extension", "extension-chromium");

/**
 * MV2 extension code was removed from Chromium ~M141, so the bundled
 * Playwright Chromium can no longer load MV2 extensions. Point
 * ADDFOX_E2E_MV2_CHROMIUM_PATH at an older Chromium/Chrome (<=140, with the
 * legacy-MV2 flags still present) to run the browser-level MV2 tests.
 */
const mv2ChromiumPath = process.env.ADDFOX_E2E_MV2_CHROMIUM_PATH;

export type Mv2ExtensionFixtures = {
  context: BrowserContext;
  extensionId: string;
  backgroundPage: Page;
};

async function getBackgroundPage(context: BrowserContext): Promise<Page> {
  let [background] = context.backgroundPages();
  if (!background) {
    background = await context.waitForEvent("backgroundpage");
  }
  return background;
}

/**
 * MV2 variant of the extension fixture: MV2 extensions use a persistent
 * background page instead of a service worker, so extension readiness and the
 * extension id come from backgroundPages()/waitForEvent("backgroundpage").
 */
export const test = base.extend<Mv2ExtensionFixtures>({
  context: async ({}, use, testInfo) => {
    if (!mv2ChromiumPath) {
      testInfo.skip(
        true,
        "MV2 is removed from the bundled Chromium (>=141); set ADDFOX_E2E_MV2_CHROMIUM_PATH to an older Chromium/Chrome to run MV2 browser tests",
      );
    }
    const context = await chromium.launchPersistentContext("", {
      executablePath: mv2ChromiumPath,
      headless: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        // Chrome/Chromium 139+ block MV2 by default; re-enable for the test run.
        "--enable-features=AllowLegacyMV2Extensions",
        "--disable-features=ExtensionManifestV2Unsupported,ExtensionManifestV2Disabled",
      ],
    });
    await getBackgroundPage(context);
    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    const background = await getBackgroundPage(context);
    await use(background.url().split("/")[2]);
  },

  backgroundPage: async ({ context }, use) => {
    await use(await getBackgroundPage(context));
  },
});

export const { expect } = base;

/** Get the path to the built MV2 extension */
export function getMv2ExtensionPath(): string {
  return extensionPath;
}
