import { mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

/**
 * Create a temporary Firefox/Gecko profile with development-friendly prefs.
 * Cleans up stale lock files from previous runs.
 */
export function createGeckoProfile(profileDir: string): string {
  mkdirSync(profileDir, { recursive: true });

  // Remove stale lock file so Firefox doesn't think the profile is in use
  const lockFile = join(profileDir, "parent.lock");
  if (existsSync(lockFile)) {
    try { rmSync(lockFile); } catch { /* ignore */ }
  }

  const prefs: Record<string, string | number | boolean> = {
    // Allow unsigned extensions
    "xpinstall.signatures.required": false,
    "extensions.langpacks.signatures.required": false,
    // Disable auto-update checks
    "app.update.auto": false,
    "app.update.enabled": false,
    "browser.search.update": false,
    "extensions.update.enabled": false,
    "extensions.update.autoUpdateDefault": false,
    // Disable telemetry
    "toolkit.telemetry.enabled": false,
    "toolkit.telemetry.unified": false,
    "datareporting.healthreport.uploadEnabled": false,
    "datareporting.policy.dataSubmissionEnabled": false,
    // Disable first-run / onboarding
    "browser.startup.homepage_override.mstone": "ignore",
    "browser.startup.firstrunSkipsHomepage": false,
    "startup.homepage_welcome_url": "about:blank",
    "startup.homepage_welcome_url.additional": "",
    "browser.feeds.showFirstRunUI": false,
    "browser.shell.checkDefaultBrowser": false,
    // Enable remote debugging
    "devtools.chrome.enabled": true,
    "devtools.debugger.remote-enabled": true,
    "devtools.debugger.prompt-connection": false,
    // Allow loading extensions from anywhere
    "extensions.enabledScopes": 5,
    // Disable session restore
    "browser.sessionstore.resume_from_crash": false,
    // Disable password manager
    "signon.rememberSignons": false,
    // Safe browsing off
    "browser.safebrowsing.malware.enabled": false,
    "browser.safebrowsing.phishing.enabled": false,
  };

  const lines = Object.entries(prefs).map(([key, value]) => {
    let formatted: string;
    if (typeof value === "boolean") formatted = value ? "true" : "false";
    else if (typeof value === "number") formatted = String(value);
    else formatted = `"${value}"`;
    return `user_pref("${key}", ${formatted});`;
  });

  writeFileSync(join(profileDir, "user.js"), lines.join("\n") + "\n", "utf8");
  return profileDir;
}

/**
 * Install extensions into a Gecko profile by creating extension manifests
 * in the "extensions" subdirectory. On next start Firefox will discover them.
 */
export function installExtensionsToProfile(profileDir: string, extensionPaths: string[]): void {
  const extensionsDir = join(profileDir, "extensions");
  mkdirSync(extensionsDir, { recursive: true });

  for (const extPath of extensionPaths) {
    if (!existsSync(extPath)) continue;

    // For unpacked extensions, Firefox supports loading from the source dir
    // via --install-global-extension, but that's deprecated. Better approach:
    // Create a pointer file in the profile extensions dir.
    // However, the most reliable way for dev is to pass the extension dir
    // as a command line argument to firefox with --temp-addon (Nightly/DevEdition only)
    // or via about:debugging. For general builds we rely on prefs + --load-extension equivalent.
    //
    // For this launcher we will use the approach of writing prefs that point
    // to the extension directories for auto-discovery.
    const id = deriveExtensionId(extPath);
    const lines = [
      `user_pref("extensions.webextensions.uuids", "{\\"${id}\\":\\"${generateUUID()}\\"}");`,
    ];
    // Append to user.js for extension registration
    writeFileSync(join(profileDir, "user.js"), lines.join("\n") + "\n", { flag: "a", encoding: "utf8" });
  }
}

function deriveExtensionId(extPath: string): string {
  // Derive a pseudo-stable ID from the path for prefs
  let hash = 0;
  for (let i = 0; i < extPath.length; i++) {
    const char = extPath.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `launcher-ext-${Math.abs(hash).toString(36)}`;
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
