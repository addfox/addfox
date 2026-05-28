/**
 * Shared types for the launcher package.
 */

/** Chromium-based browser targets */
export type ChromiumTarget =
  | "chrome"
  | "chromium"
  | "edge"
  | "brave"
  | "vivaldi"
  | "opera"
  | "santa"
  | "arc"
  | "yandex"
  | "browseros"
  | "custom";

/** Gecko-based browser targets */
export type GeckoTarget =
  | "firefox"
  | "zen"
  | "librewolf"
  | "waterfox"
  | "floorp";

/** All supported browser targets */
export type BrowserTarget = ChromiumTarget | GeckoTarget;

/** Common launch options for both engine families */
export interface CommonLaunchOptions {
  /** Absolute or relative path to the browser binary. If omitted, default paths are searched. */
  binaryPath?: string;
  /** Unpacked extension directories to load */
  extensionPaths?: string[];
  /** Initial URL to open */
  startUrl?: string;
  /** Extra CLI arguments passed to the browser */
  args?: string[];
  /** Enable verbose logging */
  verbose?: boolean;
  /** Callback invoked when the browser process exits */
  onExit?: () => void;
}

/** Result of launching a browser */
export interface BrowserProcess {
  /** Kill the browser process */
  exit: () => Promise<void>;
  /** Underlying Node.js ChildProcess */
  process: import("node:child_process").ChildProcess;
}

/** Options for resolving browser binary paths */
export interface PathOptions {
  /** User-provided path for each browser */
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
  zenPath?: string;
  librewolfPath?: string;
  waterfoxPath?: string;
  floorpPath?: string;
}
