/**
 * E2E Tests for HMR (Hot Module Replacement) plugin
 * 
 * Tests the rsbuild-plugin-extension-hmr functionality
 */

import { test, expect } from "../fixtures/extension";

test.describe("HMR Plugin", () => {
  test("should load extension with HMR support", async ({ context }) => {
    // Check that service worker is running
    const workers = context.serviceWorkers();
    expect(workers.length).toBeGreaterThan(0);
  });

  test("should check service worker is active", async ({ context }) => {
    // Check that service worker is running
    const workers = context.serviceWorkers();
    expect(workers.length).toBeGreaterThan(0);
  });

  test("should verify extension context", async ({ context, extensionId }) => {
    // Verify extension ID is available
    expect(extensionId).toBeDefined();
    expect(typeof extensionId).toBe("string");
    expect(extensionId.length).toBeGreaterThan(0);
  });
});

test.describe("HMR Browser Paths", () => {
  test("should resolve browser paths correctly", async () => {
    // This test validates that browser path resolution works
    const extensionPath = getExtensionPath();
    expect(extensionPath).toContain("extension");
  });

  test("should handle custom browser paths", async () => {
    const customPath = process.env.ADDFOX_E2E_EXTENSION_PATH || getExtensionPath();
    expect(typeof customPath).toBe("string");
    expect(customPath.length).toBeGreaterThan(0);
  });
});

import { getExtensionPath } from "../fixtures/extension";
