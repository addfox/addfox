/**
 * @addfox/rsbuild-plugin-extension-hmr
 *
 * Dev mode: launch browser, WebSocket reload manager, and precise HMR/liveReload
 * control for content/background entries (reload via WS only).
 */

import type { RsbuildPlugin, RsbuildPluginAPI } from "@rsbuild/core";
import { clearOutdatedHotUpdateFiles } from "./hmr/cleanup";
import { transformCodeToDisableHmr } from "./hmr/disable";
import { createHmrRspackPlugin, getLastCompiler, getModifiedFilesFromCompiler } from "./hmr/rspack-plugin";
import { getReloadManagerDecision, getReloadKindFromDecision } from "./hmr/scope";
import { notifyReload } from "./server/ws-server";
import type { HmrPluginOptions, HmrPluginTestDeps } from "./types";

export type { HmrPluginOptions, HmrPluginTestDeps } from "./types";
export { RELOAD_ENTRY_NAMES, CONTENT_ENTRY_NAMES, getEntryTag } from "./constants";
export { clearOutdatedHotUpdateFiles } from "./hmr/cleanup";
export { getLaunchPathFromOptions, buildDefaultPaths, getBrowserPath, isChromiumBrowser } from "./browser/paths";
export type { LaunchPathOptions } from "./browser/paths";
export { startWebSocketServer, notifyReload } from "./server/ws-server";
export type { ExtensionErrorPayload, DebugServerOpts, WsServerMode } from "./server/ws-server";
export {
  getCompilationFromStats,
  getEntrypointSignature,
  getEntriesSignature,
  getReloadEntriesSignature,
  getContentEntriesSignature,
  getReloadManagerDecision,
  getReloadKindFromDecision,
  isContentChanged,
  getEntryToModulePaths,
  getEntriesForFile,
} from "./hmr/scope";
export type { ReloadManagerDecision, ReloadKind } from "./hmr/scope";
export { normalizePathForCompare } from "./hmr/disable";
export {
  getCacheRoot,
  getBrowserProfileDir,
  /** @deprecated Use getCacheRoot/getBrowserProfileDir instead */
  getCacheTempRoot,
  getChromiumUserDataDir,
  getReloadManagerPath,
  findExistingReloadManager,
  ensureDistReady,
} from "./manager/extension";
export {
  launchBrowser,
  launchBrowserOnly,
  cleanup,
  registerCleanupHandlers,
  statsHasErrors,
} from "./browser/launcher";
export type { LaunchOnlyOptions, ChromiumRunnerOverride } from "./browser/launcher";
export { createTestWsServer } from "./server/test-server";
export { createHmrRspackPlugin } from "./hmr/rspack-plugin";

/**
 * Rsbuild plugin: in dev mode launches browser after first compile;
 * notifies reload only when content or background entry (or their dependencies) changed;
 * disables HMR/liveReload for content/background via transform and optional entry tag injection.
 */
export function hmrPlugin(
  options: HmrPluginOptions,
  testDeps?: HmrPluginTestDeps
): RsbuildPlugin {
  const entriesOrPaths = options.reloadManagerEntries ?? [];

  return {
    name: "rsbuild-plugin-extension-hmr",
    setup(api: RsbuildPluginAPI) {
      api.onAfterDevCompile(async ({ stats }) => {
        await clearOutdatedHotUpdateFiles(options.distPath, stats);

        if (options.enableReload === false || !stats) return;

        const compiler = getLastCompiler();
        const modifiedFiles = getModifiedFilesFromCompiler(compiler);

        const { shouldNotify, contentChanged, backgroundChanged } = getReloadManagerDecision(stats, {
          compiler: { modifiedFiles: modifiedFiles.size > 0 ? modifiedFiles : undefined },
        });
        if (shouldNotify) {
          const kind = getReloadKindFromDecision(
            contentChanged,
            backgroundChanged,
            options.autoRefreshContentPage ?? false
          );
          notifyReload(kind);
        }
      });

      api.onBeforeStartDevServer(() => {
        if (entriesOrPaths.length === 0) return;
        api.transform(
          { test: /\.(js|ts)$/, environments: ["web"] },
          ({ resourcePath, code }) =>
            transformCodeToDisableHmr(resourcePath, entriesOrPaths, code)
        );
      });

      api.onBeforeCreateCompiler(async ({ bundlerConfigs }) => {
        const config = bundlerConfigs[0] as { plugins?: unknown[] } | undefined;
        if (!config) return;
        config.plugins = config.plugins ?? [];
        config.plugins.push(createHmrRspackPlugin(options, testDeps));
      });
    },
  };
}
