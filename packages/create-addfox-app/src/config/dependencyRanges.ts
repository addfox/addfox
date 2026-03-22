/**
 * Published dependency ranges (caret baseline) for scaffold `package.json` under `create-addfox-app/templates/`.
 * Bump when releasing new versions of `addfox`, `@addfox/utils`, or `@addfox/rsbuild-plugin-vue`.
 *
 * `ADDFOX_0_1_SCAFFOLD_RANGE` is a semver range for tooling/docs that must accept 0.1.x prereleases.
 */
export const ADDFOX_CLI_PACKAGE_VERSION = "^0.1.1-beta.7" as const;
export const ADDFOX_UTILS_PACKAGE_VERSION = "^0.1.1-beta.5" as const;
export const ADDFOX_RSBUILD_PLUGIN_VUE_VERSION = "^0.1.1-beta.5" as const;

/**
 * `^0.1.0` does not satisfy npm prereleases such as `0.1.1-beta.4` (semver rules).
 * `>=0.1.0-0` includes prereleases in the 0.1.x line until a stable 0.2.0 ships.
 */
export const ADDFOX_0_1_SCAFFOLD_RANGE = ">=0.1.0-0 <0.2.0" as const;

/** Shared across all scaffold templates; bump when @rsbuild/core latest stable changes. */
export const RSBUILD_CORE_SCAFFOLD_RANGE = "^1.7.3" as const;
