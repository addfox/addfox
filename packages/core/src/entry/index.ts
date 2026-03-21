/**
 * @addfox/core/entry
 * 
 * Entry discovery and resolution
 */

// Entry discovery
export {
  discoverEntries,
  getHtmlEntryNames,
  getScriptOnlyEntryNames,
  getAllEntryNames,
} from "./discoverer.ts";

export type { EntryDiscovererOptions } from "./discoverer.ts";

// Entry resolution
export { resolveEntries, resolveEntriesLegacy, extractEntriesFromManifest } from "./resolver.ts";
export type { EntryResolverOptions, EntryResolutionResult } from "./resolver.ts";

// Manifest entry parser
export type { ParsedEntryFromManifest, ExtractedEntry } from "./manifestParser.ts";

// HTML entry parsing
export {
  parseAddfoxEntryFromHtml,
  getScriptInjectIfMatches,
  resolveScriptFromHtmlStrict,
  isScriptSrcRelative,
} from "./html.ts";

export type { AddfoxEntryScriptResult } from "./html.ts";
