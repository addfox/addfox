export { launchBrowser } from "./launcher";
export { findBrowserPath, isChromium, isGecko } from "./paths";
export { watchFiles } from "./shared/watcher";
export { createTempProfile, spawnBrowserProcess } from "./shared/process-manager";

export type {
  BrowserTarget,
  ChromiumTarget,
  GeckoTarget,
  CommonLaunchOptions,
  BrowserProcess,
  PathOptions,
} from "./types";

export { launchChromium } from "./chromium";
export { launchGecko, createGeckoProfile } from "./gecko";
