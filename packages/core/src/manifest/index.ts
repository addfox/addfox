/**
 * @addfox/core/manifest
 * 
 * Manifest loading, generation, and building
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

// Manifest generator
export {
  generateManifestFromEntries,
  autoFillManifestFields,
  generateManifestConfig,
  mergeWithGeneratedManifest,
  hasRequiredFields,
} from "./generator.ts";
