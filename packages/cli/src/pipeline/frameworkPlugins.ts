/**
 * Central list of framework Rsbuild plugins. Add or remove plugins here only.
 */

import type { RsbuildConfig } from "@rsbuild/core";
import type { PipelineContext } from "@addfox/core";
import { entryPlugin } from "@addfox/rsbuild-plugin-extension-entry";
import { extensionPlugin } from "@addfox/rsbuild-plugin-extension-manifest";
import { monitorPlugin } from "@addfox/rsbuild-plugin-extension-monitor";
import { getVueRsbuildPlugins } from "@addfox/rsbuild-plugin-vue";

type LoosePlugin = RsbuildConfig["plugins"] extends (infer P)[] ? P : never;

function expandUserPlugins(
  userPlugins: RsbuildConfig["plugins"] | undefined,
  appRoot: string
): LoosePlugin[] {
  const out: LoosePlugin[] = [];
  const list = userPlugins ?? [];
  const arr = Array.isArray(list) ? list : [list];
  for (const p of arr) {
    const name = (p as { name?: string } | null)?.name;
    if (name === "rsbuild-plugin-vue") {
      const vuePlugins = getVueRsbuildPlugins(appRoot);
      if (Array.isArray(vuePlugins)) out.push(...(vuePlugins as LoosePlugin[]));
    }
    out.push(p as LoosePlugin);
  }
  return out;
}

/**
 * Build the framework plugin array for base Rsbuild config.
 * Modifying the pipeline plugin set = edit this function only.
 */
export function buildFrameworkPluginList(ctx: PipelineContext): LoosePlugin[] {
  const useEntry = (ctx.config as { entry?: Record<string, unknown> | false }).entry !== false;
  const expanded = expandUserPlugins(ctx.config.plugins, ctx.root);
  const useMonitor = ctx.isDev && ctx.config.debug === true;

  const list: LoosePlugin[] = [];
  if (useEntry) {
    list.push(entryPlugin(ctx.config, ctx.entries, ctx.distPath, { browser: ctx.browser }) as LoosePlugin);
  }
  list.push(...expanded);

  if (useMonitor) {
    list.push(monitorPlugin(ctx.config, ctx.entries, ctx.browser) as LoosePlugin);
  }
  list.push(extensionPlugin(ctx.config, ctx.entries, ctx.browser, ctx.distPath) as LoosePlugin);
  return list;
}
