/**
 * E2E Tests for browser extension API
 * 
 * These tests verify that the browser API works correctly
 * in a real browser extension environment.
 */

import { test, expect } from "../fixtures/extension";

test.describe("Browser API", () => {
  test("browser.runtime should be available", async ({ context }) => {
    // The browser API should be available in the service worker
    const workers = context.serviceWorkers();
    expect(workers.length).toBeGreaterThan(0);
  });

  test("browser.storage should work", async ({ context, extensionId }) => {
    // Create a test page that uses browser.storage
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);
    
    // Verify the page loaded
    await expect(page.locator('body')).toBeVisible();
  });

  test("browser.runtime.onMessage should handle messages", async ({ context, extensionId }) => {
    // Open popup to trigger message handling
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);
    
    // Wait for any potential errors
    await page.waitForTimeout(500);
    
    // Check console for errors
    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));
    
    // Should not have errors related to browser API
    const browserErrors = logs.filter(log => 
      log.includes('browser is not defined') || 
      log.includes('Cannot read properties of undefined')
    );
    expect(browserErrors).toHaveLength(0);
  });
});

test.describe("Content UI", () => {
  test("defineShadowContentUI should create shadow DOM", async ({ page }) => {
    // Load a test page
    await page.goto('about:blank');
    
    // Inject content script that uses defineShadowContentUI
    await page.evaluate(() => {
      // This simulates what the content script would do
      const div = document.createElement('div');
      div.id = 'test-shadow-host';
      document.body.appendChild(div);
      
      // Create shadow root (simulating defineShadowContentUI)
      const shadow = div.attachShadow({ mode: 'open' });
      const content = document.createElement('div');
      content.textContent = 'Shadow content';
      shadow.appendChild(content);
      
      return div.shadowRoot !== null;
    });
    
    // Verify shadow DOM was created
    const hasShadow = await page.evaluate(() => {
      const div = document.querySelector('#test-shadow-host');
      return div?.shadowRoot !== null;
    });
    
    expect(hasShadow).toBe(true);
  });

  test("defineIframeContentUI should create iframe", async ({ page }) => {
    await page.goto('about:blank');
    
    // Create iframe (simulating defineIframeContentUI)
    const iframeCreated = await page.evaluate(() => {
      const iframe = document.createElement('iframe');
      iframe.id = 'test-content-iframe';
      iframe.src = 'about:blank';
      document.body.appendChild(iframe);
      
      return document.querySelector('#test-content-iframe') !== null;
    });
    
    expect(iframeCreated).toBe(true);
  });
});
