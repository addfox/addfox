/**
 * @addfox/core/manifest
 * 
 * Manifest loading and building
 */

// Manifest builder
export {
  buildForBrowser,
  resolveManifestChromium,
  resolveManifestFirefox,
  resolveManifestForTarget,
  getManifestRecordForTarget,
} from "./builder.ts";

export type { ContentScriptOutput } from "./builder.ts";

// Manifest loader
export {
  resolveManifestInput,
  ManifestLoader,
} from "./loader.ts";

export type { ManifestValidationTarget } from "./loader.ts";
