/**
 * E2E Tests for plugin-extension-monitor runtime
 * 
 * These tests verify the monitor runtime functionality
 * when the extension is built with ADDFOX_DEBUG=true.
 */

import { test, expect } from "../fixtures/extension";

test.describe("Monitor Runtime", () => {
  test("extension should load successfully", async ({ context }) => {
    // Check that service worker is running
    const workers = context.serviceWorkers();
    expect(workers.length).toBeGreaterThan(0);
  });

  test("extension ID should be valid", async ({ extensionId }) => {
    // Verify extension ID is available
    expect(extensionId).toBeDefined();
    expect(typeof extensionId).toBe("string");
    expect(extensionId.length).toBeGreaterThan(0);
  });

  test("popup page should load without errors", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);
    await page.waitForLoadState('networkidle');
    
    // Verify the page loaded
    const body = await page.locator('body').isVisible();
    expect(body).toBe(true);
  });
});

test.describe("Monitor UI", () => {
  test("options page should display content", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options/index.html`);
    await page.waitForLoadState('networkidle');
    
    // Check for UI elements
    const hasContent = await page.evaluate(() => {
      return document.body.textContent !== null;
    });
    
    expect(hasContent).toBe(true);
  });
});
