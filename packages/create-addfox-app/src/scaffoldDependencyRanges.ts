/**
 * Dependency ranges written into scaffolded `package.json` (templates + any post-patch).
 *
 * `^0.1.0` does not satisfy npm prereleases such as `0.1.1-beta.4` (semver rules).
 * `>=0.1.0-0` includes prereleases in the 0.1.x line until a stable 0.2.0 ships.
 *
 * Keep in sync with repo `templates` folder package.json files (addfox, @addfox/utils).
 */
export const ADDFOX_0_1_SCAFFOLD_RANGE = ">=0.1.0-0 <0.2.0" as const;

/** Shared across all scaffold templates; bump when @rsbuild/core latest stable changes. */
export const RSBUILD_CORE_SCAFFOLD_RANGE = "^1.7.3" as const;
