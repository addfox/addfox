import { createRequire } from "module";
import { resolve } from "path";
import type { RsbuildPlugin } from "@rsbuild/core";

/**
 * Create require that resolves from app root so @rsbuild/plugin-vue, @rsbuild/plugin-vue-jsx and @rsbuild/plugin-babel
 * are found in the app's node_modules (e.g. examples/manual-install).
 */
function createAppRequire(appRoot: string) {
  return createRequire(resolve(appRoot, "package.json"));
}

/** Return Rsbuild plugins to prepend before addfox-vue (Vue + Vue JSX via @rsbuild/plugin-vue-jsx; Babel required by vue-jsx). */
export function getVueRsbuildPlugins(
  appRoot: string,
  /** Optional require (e.g. for tests to simulate missing deps). */
  appRequireOverride?: NodeRequire
): unknown[] {
  const appRequire = appRequireOverride ?? createAppRequire(appRoot);
  try {
    const { pluginBabel } = appRequire("@rsbuild/plugin-babel");
    const { pluginVue } = appRequire("@rsbuild/plugin-vue");
    const { pluginVueJsx } = appRequire("@rsbuild/plugin-vue-jsx");
    return [
      pluginBabel({ include: /\.(?:jsx|tsx)$/ }),
      pluginVue(),
      pluginVueJsx(),
    ];
  } catch {
    return [];
  }
}

/**
 * Rsbuild plugin for Vue 3 + Vue JSX (via @rsbuild/plugin-vue-jsx).
 * Usage: import vue from "@addfox/rsbuild-plugin-vue"; plugins: [vue()]
 */
export function addfoxVuePlugin(): RsbuildPlugin {
  return {
    name: "rsbuild-plugin-vue",
    enforce: "pre",
    setup() {
      // Vue/Babel plugins are injected by CLI via getVueRsbuildPlugins before createRsbuild.
    },
  } satisfies RsbuildPlugin;
}

export default addfoxVuePlugin;
