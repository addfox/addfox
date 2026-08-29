/**
 * E2E Tests for Manifest V2 support
 *
 * - Artifact assertions read the built MV2 extension from
 *   examples/addfox-with-mv2 (build via `pnpm run e2e:build:mv2`) and verify
 *   the MV2 manifest shape: background.scripts, browser_action, string CSP.
 * - Browser assertions load the extension in Chromium with MV2 re-enable
 *   flags and verify the persistent background page and popup work.
 */

import { test as artifactTest, expect as artifactExpect } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "path";
import { test, expect, getMv2ExtensionPath } from "../fixtures/mv2-extension";

function readMv2Manifest(): Record<string, unknown> {
  const manifestPath = path.join(getMv2ExtensionPath(), "manifest.json");
  artifactExpect(fs.existsSync(manifestPath)).toBe(true);
  return JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
}

/** Assert every file the manifest references actually exists in the dist dir. */
function expectManifestFilesExist(manifest: Record<string, unknown>): void {
  const root = getMv2ExtensionPath();
  const refs: string[] = [];
  const background = manifest.background as { scripts?: string[] } | undefined;
  refs.push(...(background?.scripts ?? []));
  const browserAction = manifest.browser_action as { default_popup?: string } | undefined;
  if (browserAction?.default_popup) refs.push(browserAction.default_popup);
  if (typeof manifest.options_page === "string") refs.push(manifest.options_page);
  for (const cs of (manifest.content_scripts as Array<{ js?: string[] }> | undefined) ?? []) {
    refs.push(...(cs.js ?? []));
  }
  artifactExpect(refs.length).toBeGreaterThan(0);
  for (const ref of refs) {
    artifactExpect(fs.existsSync(path.join(root, ref)), `manifest references missing file: ${ref}`).toBe(true);
  }
}

artifactTest.describe("MV2 manifest artifacts", () => {
  artifactTest("manifest_version is 2 with MV2 field shapes", () => {
    const manifest = readMv2Manifest();

    artifactExpect(manifest.manifest_version).toBe(2);

    // MV2 background: scripts array, never service_worker
    const background = manifest.background as { scripts?: unknown; service_worker?: unknown };
    artifactExpect(Array.isArray(background.scripts)).toBe(true);
    artifactExpect(background.service_worker).toBeUndefined();

    // MV2 toolbar action: browser_action, never action
    artifactExpect(manifest.action).toBeUndefined();
    const browserAction = manifest.browser_action as { default_popup?: string };
    artifactExpect(browserAction).toBeDefined();
    artifactExpect(browserAction.default_popup).toBe("popup.html");

    // MV2 has no host_permissions
    artifactExpect(manifest.host_permissions).toBeUndefined();

    // CSP, when present, must be a string (MV3 object form is invalid in MV2)
    if (manifest.content_security_policy != null) {
      artifactExpect(typeof manifest.content_security_policy).toBe("string");
    }

    // WAR, when present, must be a string array (MV2 shape)
    if (manifest.web_accessible_resources != null) {
      artifactExpect(Array.isArray(manifest.web_accessible_resources)).toBe(true);
      for (const item of manifest.web_accessible_resources as unknown[]) {
        artifactExpect(typeof item).toBe("string");
      }
    }
  });

  artifactTest("content scripts carry built js entries", () => {
    const manifest = readMv2Manifest();
    const contentScripts = manifest.content_scripts as Array<{ matches?: unknown; js?: string[] }>;
    artifactExpect(Array.isArray(contentScripts)).toBe(true);
    artifactExpect(contentScripts.length).toBeGreaterThan(0);
    for (const cs of contentScripts) {
      artifactExpect(cs.matches).toBeDefined();
      artifactExpect(Array.isArray(cs.js)).toBe(true);
      artifactExpect(cs.js!.length).toBeGreaterThan(0);
    }
  });

  artifactTest("options page uses MV2 options_page string field", () => {
    const manifest = readMv2Manifest();
    artifactExpect(manifest.options_ui).toBeUndefined();
    artifactExpect(manifest.options_page).toBe("options.html");
  });

  artifactTest("every file referenced by the manifest exists in dist", () => {
    expectManifestFilesExist(readMv2Manifest());
  });
});

test.describe("MV2 extension in browser", () => {
  test("persistent background page loads with extension APIs", async ({ backgroundPage, extensionId }) => {
    artifactExpect(extensionId).toBeTruthy();
    expect(backgroundPage.url()).toContain(`chrome-extension://${extensionId}/`);

    const hasRuntime = await backgroundPage.evaluate(() => {
      return typeof chrome !== "undefined" && typeof chrome.runtime?.id === "string";
    });
    expect(hasRuntime).toBe(true);
  });

  test("popup renders and ping-pong reaches the MV2 background", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    await expect(page.locator("h1")).toHaveText("exo-with-mv2 Popup");

    const pong = await page.evaluate(() => {
      return new Promise<{ type?: string; from?: string }>((resolvePromise, reject) => {
        chrome.runtime.sendMessage({ type: "PING" }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolvePromise(response);
          }
        });
      });
    });
    expect(pong.type).toBe("PONG");
    expect(pong.from).toBe("background");
  });
});
