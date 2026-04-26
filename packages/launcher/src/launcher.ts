import type { BrowserTarget, CommonLaunchOptions, BrowserProcess } from "./types";
import { isChromium, isGecko } from "./paths";
import { launchChromium, type ChromiumLaunchOptions } from "./chromium";
import { launchGecko, type GeckoLaunchOptions } from "./gecko";

const ALL_TARGETS: BrowserTarget[] = [
  "chrome", "chromium", "edge", "brave", "vivaldi", "opera", "santa", "arc", "yandex", "browseros", "custom",
  "firefox", "zen", "librewolf", "waterfox", "floorp",
];

export interface UnifiedLaunchOptions extends CommonLaunchOptions {
  /** Browser target */
  target: BrowserTarget;
  /** User data dir (profile). Created if not provided. */
  userDataDir?: string;
  /** Enable remote debugging / devtools */
  devtools?: boolean;
  remoteDebuggingPort?: number;
  /** Path resolution options */
  pathOptions?: import("./types").PathOptions;
  /** Watch source directories for changes and restart */
  watchPaths?: string[];
}

/**
 * Launch any supported browser with a unified API.
 * Automatically dispatches to Chromium or Gecko runner based on target.
 */
export async function launchBrowser(options: UnifiedLaunchOptions): Promise<BrowserProcess> {
  const { target, userDataDir, devtools, remoteDebuggingPort, pathOptions, watchPaths, ...common } = options;

  if (!ALL_TARGETS.includes(target)) {
    throw new Error(`Unsupported browser target: ${target}`);
  }

  if (isChromium(target)) {
    const chromiumOpts: ChromiumLaunchOptions = {
      ...common,
      target,
      userDataDir,
      devtools,
      remoteDebuggingPort,
      pathOptions,
    };
    return launchChromium(chromiumOpts);
  }

  if (isGecko(target)) {
    const geckoArgs = common.args ? [...common.args] : [];
    if (devtools) geckoArgs.push("-jsconsole");
    const geckoOpts: GeckoLaunchOptions = {
      ...common,
      target,
      userDataDir,
      remoteDebuggingPort,
      pathOptions,
      args: geckoArgs,
    };
    return launchGecko(geckoOpts);
  }

  throw new Error(`Unsupported browser target: ${target}`);
}
