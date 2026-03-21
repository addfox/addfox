import type { LaunchTarget, ReloadManagerEntry } from "@addfox/core";
import type { LaunchPathOptions } from "./browser/paths";
import type { ChromiumRunnerOverride } from "./browser/launcher";

export interface HmrPluginOptions {
  distPath: string;
  autoOpen?: boolean;
  browser?: LaunchTarget;
  chromePath?: string;
  chromiumPath?: string;
  edgePath?: string;
  bravePath?: string;
  vivaldiPath?: string;
  operaPath?: string;
  santaPath?: string;
  arcPath?: string;
  yandexPath?: string;
  browserosPath?: string;
  customPath?: string;
  firefoxPath?: string;
  cache?: boolean;
  wsPort?: number;
  enableReload?: boolean;
  autoRefreshContentPage?: boolean;
  /**
   * Content/background entries with name and absolute path.
   * Enables precise entry tag injection and reloadManager-only scope; only these entries trigger WS notify.
   */
  reloadManagerEntries?: ReloadManagerEntry[];
  /** When true, enable debug: error output with bundler/framework, and .addfox/error.md write/delete. */
  debug?: boolean;
  /** Project root (for framework detection and error.md path). */
  root?: string;
  /** Output root under project (e.g. ".addfox") for error.md path. */
  outputRoot?: string;
}

export interface HmrPluginTestDeps {
  runChromiumRunner?: ChromiumRunnerOverride;
  ensureDistReady?: (distPath: string) => Promise<boolean>;
  getBrowserPath?: (b: LaunchTarget, o: LaunchPathOptions) => string | null;
}
