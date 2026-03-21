/**
 * @addfox/core/config
 * 
 * Configuration loading and resolution
 */

// Config definition
export { defineConfig } from "./defineConfig.ts";

// Config loading
export {
  resolveAddfoxConfig,
  loadConfigFile,
  getResolvedConfigFilePath,
  getResolvedRstestConfigFilePath,
  clearConfigCache,
} from "./loader.ts";

export type {
  ConfigResolutionResult,
  ConfigLoaderOptions,
} from "./loader.ts";
