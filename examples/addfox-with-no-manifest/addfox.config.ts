import { defineConfig } from "addfox";

/**
 * No Manifest Configuration Example
 * 
 * This example demonstrates Addfox's auto-manifest generation feature.
 * You don't need to provide a manifest object or manifest.json file.
 * Addfox automatically generates the manifest from your entry files.
 * 
 * Required entry folders (create these in app/):
 * - background/ → background service worker
 * - content/    → content script
 * - popup/      → popup UI
 * - options/    → options page
 */
export default defineConfig({
  // No manifest configuration needed!
  // Addfox will auto-generate from entries in app/ folder
  
  // You can still customize other options:
  // outDir: "extension",
  // hotReload: { port: 23333 },
});
