import { resolve, join } from "path";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
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

/** Command names to search in PATH for each browser target. */
const PATH_ALIASES: Record<LaunchTarget, string[]> = {
  chrome: ["chrome", "google-chrome", "google-chrome-stable"],
  chromium: ["chromium", "chromium-browser", "chrome"],
  edge: ["msedge", "microsoft-edge", "microsoft-edge-stable"],
  brave: ["brave", "brave-browser"],
  vivaldi: ["vivaldi", "vivaldi-stable"],
  opera: ["opera", "opera-stable", "launcher"],
  santa: ["santa-browser", "santa"],
  arc: ["arc"],
  yandex: ["yandex-browser", "browser"],
  browseros: ["browseros"],
  custom: ["custom-browser"],
  firefox: ["firefox", "firefox-esr"],
};

/** Scoop install paths relative to %USERPROFILE% for each browser target. */
const SCOOP_PATHS: Partial<Record<LaunchTarget, string[]>> = {
  chrome: ["scoop/apps/googlechrome/current/chrome.exe"],
  chromium: ["scoop/apps/chromium/current/chrome.exe"],
  brave: ["scoop/apps/brave/current/brave.exe"],
  vivaldi: ["scoop/apps/vivaldi/current/Application/vivaldi.exe"],
  opera: ["scoop/apps/opera/current/launcher.exe", "scoop/apps/opera/current/opera.exe"],
  firefox: ["scoop/apps/firefox/current/firefox.exe", ".mozbuild/firefox/firefox.exe"],
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
    const extras: string[] = [];

    if (userProfile) {
      const scoop = SCOOP_PATHS[browser];
      if (scoop) {
        for (const rel of scoop) {
          extras.push(resolve(userProfile, rel));
        }
      }
    }

    if (localAppData) {
      if (browser === "vivaldi") {
        extras.push(resolve(localAppData, "Vivaldi\\Application\\vivaldi.exe"));
      }
      if (browser === "arc") {
        extras.push(resolve(localAppData, "Programs\\Arc\\Application\\Arc.exe"));
      }
      if (browser === "yandex") {
        extras.push(resolve(localAppData, "Yandex\\YandexBrowser\\Application\\browser.exe"));
      }
      if (browser === "firefox") {
        extras.push(resolve(localAppData, "Mozilla Firefox\\firefox.exe"));
      }
    }

    if (browser === "firefox") {
      if (process.env.PROGRAMFILES) {
        extras.push(resolve(process.env.PROGRAMFILES, "Mozilla Firefox\\firefox.exe"));
      }
      if (process.env["PROGRAMFILES(X86)"]) {
        extras.push(resolve(process.env["PROGRAMFILES(X86)"], "Mozilla Firefox\\firefox.exe"));
      }
    }

    return [...extras, ...(basePaths ?? [])];
  }
  return basePaths;
}

/**
 * Search for a command in the system PATH.
 */
function findInPath(command: string): string | null {
  const pathEnv = process.env.PATH || process.env.Path;
  if (!pathEnv) return null;
  const isWin = process.platform === "win32";
  const extensions = isWin
    ? (process.env.PATHEXT || ".EXE;.CMD;.BAT").split(";")
    : [""];
  const dirs = pathEnv.split(isWin ? ";" : ":");
  for (const dir of dirs) {
    for (const ext of extensions) {
      const full = resolve(dir.trim(), command + ext.toLowerCase());
      if (existsSync(full)) return full;
    }
  }
  return null;
}

/** Search PATH for any of the known command aliases of a browser. */
function findBrowserInPath(browser: LaunchTarget): string | null {
  for (const cmd of PATH_ALIASES[browser]) {
    const found = findInPath(cmd);
    if (found) return found;
  }
  return null;
}

/* ------------------------------------------------------------------
 *  fx-runner style discovery for Firefox
 *  ------------------------------------------------------------------ */

/** Query a single value from the Windows Registry using reg.exe */
function queryRegistry(key: string, valueName: string): string | null {
  try {
    const output = execSync(`reg query "${key}" /v ${valueName}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
      windowsHide: true,
    });
    const match = output.match(/REG_SZ\s+(.+)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

function findFirefoxViaRegistry(): string | null {
  const hives = ["HKCU", "HKLM"];
  for (const hive of hives) {
    const version = queryRegistry(`${hive}\\Software\\Mozilla\\Mozilla Firefox`, "CurrentVersion");
    if (version) {
      const exePath = queryRegistry(`${hive}\\Software\\Mozilla\\Mozilla Firefox\\${version}\\Main`, "PathToExe");
      if (exePath && existsSync(exePath)) return exePath;
    }
  }
  return null;
}

function findFirefoxViaMdfind(): string | null {
  try {
    const output = execSync(`mdfind "kMDItemCFBundleIdentifier == 'org.mozilla.firefox'"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const paths = output.trim().split("\n").filter(Boolean);
    const official = paths.find((p) => p.startsWith("/Applications/"));
    const appPath = official || paths[0];
    if (!appPath) return null;
    const binaryPath = `${appPath}/Contents/MacOS/firefox`;
    return existsSync(binaryPath) ? binaryPath : null;
  } catch {
    return null;
  }
}

function findFirefoxBinary(): string | null {
  if (process.platform === "win32") {
    const fromRegistry = findFirefoxViaRegistry();
    if (fromRegistry) return fromRegistry;
  }
  if (process.platform === "darwin") {
    const fromMdfind = findFirefoxViaMdfind();
    if (fromMdfind) return fromMdfind;
  }
  return findBrowserInPath("firefox");
}

export function getBrowserPath(browser: LaunchTarget, options: LaunchPathOptions): string | null {
  const userPath = getLaunchPathFromOptions(browser, options);
  if (userPath != null && userPath.trim() !== "") return userPath.trim();
  const paths = buildDefaultPaths(browser, process.platform);
  if (paths && paths.length > 0) {
    for (const p of paths) {
      if (existsSync(p)) return p;
    }
  }
  // Fallback: search PATH for the browser binary
  const pathResult = findBrowserInPath(browser);
  if (pathResult) return pathResult;
  // Final fallback for Firefox: use fx-runner style discovery
  if (browser === "firefox") {
    const fxPath = findFirefoxBinary();
    if (fxPath) return fxPath;
  }
  if (browser === "chromium") return getBrowserPath("chrome", options);
  return null;
}

export function isChromiumBrowser(browser: LaunchTarget): browser is ChromiumLaunchTarget {
  return browser !== "firefox";
}
