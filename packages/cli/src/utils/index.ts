/**
 * CLI utilities
 */

export {
  getDistSizeSync,
  getBuildOutputSize,
  formatBytes,
  isSourceMapEnabled,
} from "./buildStats.ts";

export {
  ensureDependencies,
  readProjectPackageJson,
  runInstall,
} from "./ensureDeps.ts";

export type {
  PackageManager,
  RunInstallFn,
  EnsureDependenciesOptions,
} from "./ensureDeps.ts";

export {
  wrapAddfoxOutput,
  setOutputPrefixRsbuild,
  setOutputPrefixAddfox,
  getRawWrites,
  createPrefixedWrite,
  ADDFOX_PREFIX,
} from "./prefixStream.ts";

export { zipDist } from "./zipDist.ts";
export type { ZipDistDeps } from "./zipDist.ts";

export {
  getVersion,
  getRsbuildVersion,
} from "./version.ts";
