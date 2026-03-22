/**
 * Published dependency ranges (caret baseline) for scaffold `package.json` under `create-addfox-app/templates/`.
 * Bump when releasing new versions of `addfox`, `@addfox/utils`, or `@rsbuild/plugin-vue` in templates.
 *
 * Templates put `addfox` and `@rsbuild/plugin-*` in **devDependencies** (build-time only).
 * `@addfox/utils` is in **dependencies** so extension runtime code can import it.
 * Do **not** list `@rsbuild/core` in templates: it is pulled in by `addfox` → `@addfox/cli` / `@addfox/core`
 * and satisfies peers for Rsbuild plugins.
 *
 * `ADDFOX_0_1_SCAFFOLD_RANGE` is a semver range for tooling/docs that must accept 0.1.x prereleases.
 */
export const ADDFOX_CLI_PACKAGE_VERSION = "^0.1.1-beta.7" as const;
export const ADDFOX_UTILS_PACKAGE_VERSION = "^0.1.1-beta.5" as const;
/** `@rsbuild/plugin-vue` range in `template-vue-ts` / `template-vue-js` (aligned across JS/TS). */
export const RSBUILD_PLUGIN_VUE_PACKAGE_VERSION = "^1.2.7" as const;

/**
 * `^0.1.0` does not satisfy npm prereleases such as `0.1.1-beta.4` (semver rules).
 * `>=0.1.0-0` includes prereleases in the 0.1.x line until a stable 0.2.0 ships.
 */
export const ADDFOX_0_1_SCAFFOLD_RANGE = ">=0.1.0-0 <0.2.0" as const;
