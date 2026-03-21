import { resolve } from "path";
import { existsSync } from "node:fs";
import type { LaunchTarget, ChromiumLaunchTarget } from "@addfox/core";

type PlatformPaths = Record<string, string[]>;

const BROWSER_DEFAULT_PATHS: Record<LaunchTarget, PlatformPaths> = {
  chrome: {
    win32: [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ],
    darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
    linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"],
  },
  chromium: {
    win32: [
      "C:\\Program Files\\Chromium\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe",
    ],
    darwin: ["/Applications/Chromium.app/Contents/MacOS/Chromium"],
    linux: ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable"],
  },
  edge: {
    win32: [
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    ],
    darwin: ["/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"],
    linux: ["/usr/bin/microsoft-edge", "/usr/bin/microsoft-edge-stable"],
  },
  brave: {
    win32: [
      "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
      "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
    ],
    darwin: ["/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"],
    linux: ["/usr/bin/brave-browser", "/usr/bin/brave"],
  },
  vivaldi: {
    win32: [
      "C:\\Program Files\\Vivaldi\\Application\\vivaldi.exe",
      "C:\\Program Files (x86)\\Vivaldi\\Application\\vivaldi.exe",
    ],
    darwin: ["/Applications/Vivaldi.app/Contents/MacOS/Vivaldi"],
    linux: ["/usr/bin/vivaldi-stable", "/usr/bin/vivaldi"],
  },
  opera: {
    win32: [
      "C:\\Program Files\\Opera\\launcher.exe",
      "C:\\Program Files (x86)\\Opera\\launcher.exe",
    ],
    darwin: ["/Applications/Opera.app/Contents/MacOS/Opera"],
    linux: ["/usr/bin/opera", "/usr/bin/opera-stable"],
  },
  santa: {
    win32: [
      "C:\\Program Files\\Santa Browser\\Application\\Santa Browser.exe",
      "C:\\Program Files (x86)\\Santa Browser\\Application\\Santa Browser.exe",
    ],
    darwin: ["/Applications/Santa Browser.app/Contents/MacOS/Santa Browser"],
    linux: ["/usr/bin/santa-browser"],
  },
  arc: {
    win32: [
      "C:\\Program Files\\Arc\\Application\\Arc.exe",
      "C:\\Program Files (x86)\\Arc\\Application\\Arc.exe",
    ],
    darwin: ["/Applications/Arc.app/Contents/MacOS/Arc"],
    linux: ["/usr/bin/arc", "/opt/Arc/arc"],
  },
  yandex: {
    win32: [
      "C:\\Program Files\\Yandex\\YandexBrowser\\Application\\browser.exe",
      "C:\\Program Files (x86)\\Yandex\\YandexBrowser\\Application\\browser.exe",
    ],
    darwin: ["/Applications/Yandex.app/Contents/MacOS/Yandex"],
    linux: ["/usr/bin/yandex-browser", "/opt/yandex/browser/browser"],
  },
  browseros: {
    win32: [
      "C:\\Program Files\\BrowserOS\\BrowserOS.exe",
      "C:\\Program Files (x86)\\BrowserOS\\BrowserOS.exe",
    ],
    darwin: ["/Applications/BrowserOS.app/Contents/MacOS/BrowserOS"],
    linux: ["/usr/bin/browseros", "/opt/BrowserOS/browseros"],
  },
  custom: { win32: [], darwin: [], linux: [] },
  firefox: {
    win32: [
      "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
      "C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe",
    ],
    darwin: ["/Applications/Firefox.app/Contents/MacOS/firefox"],
    linux: ["/usr/bin/firefox", "/usr/bin/firefox-esr"],
  },
};

export type LaunchPathOptions = Pick<
  Record<string, string | undefined>,
  "chromePath" | "chromiumPath" | "edgePath" | "bravePath" | "vivaldiPath" | "operaPath" | "santaPath" | "arcPath" | "yandexPath" | "browserosPath" | "customPath" | "firefoxPath"
>;

export function getLaunchPathFromOptions(browser: LaunchTarget, options: LaunchPathOptions): string | undefined {
  const map: Record<LaunchTarget, string | undefined> = {
    chrome: options.chromePath,
    chromium: options.chromiumPath,
    edge: options.edgePath,
    brave: options.bravePath,
    vivaldi: options.vivaldiPath,
    opera: options.operaPath,
    santa: options.santaPath,
    arc: options.arcPath,
    yandex: options.yandexPath,
    browseros: options.browserosPath,
    custom: options.customPath,
    firefox: options.firefoxPath,
  };
  return map[browser];
}

export function buildDefaultPaths(browser: LaunchTarget, platform: string): string[] | undefined {
  const basePaths = BROWSER_DEFAULT_PATHS[browser]?.[platform];
  if (platform === "win32") {
    const userProfile = process.env.USERPROFILE;
    const localAppData = process.env.LOCALAPPDATA;
    if (browser === "vivaldi" && userProfile) {
      return [resolve(userProfile, "AppData\\Local\\Vivaldi\\Application\\vivaldi.exe"), ...(basePaths ?? [])];
    }
    if (browser === "arc" && localAppData) {
      return [resolve(localAppData, "Programs\\Arc\\Application\\Arc.exe"), ...(basePaths ?? [])];
    }
    if (browser === "yandex" && localAppData) {
      return [resolve(localAppData, "Yandex\\YandexBrowser\\Application\\browser.exe"), ...(basePaths ?? [])];
    }
  }
  return basePaths;
}

export function getBrowserPath(browser: LaunchTarget, options: LaunchPathOptions): string | null {
  const userPath = getLaunchPathFromOptions(browser, options);
  if (userPath != null && userPath.trim() !== "") return userPath.trim();
  const paths = buildDefaultPaths(browser, process.platform);
  if (!paths || paths.length === 0) {
    if (browser === "chromium") return getBrowserPath("chrome", options);
    return null;
  }
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  if (browser === "chromium") return getBrowserPath("chrome", options);
  return null;
}

export function isChromiumBrowser(browser: LaunchTarget): browser is ChromiumLaunchTarget {
  return browser !== "firefox";
}
