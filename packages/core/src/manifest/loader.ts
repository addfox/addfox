import { resolve } from "path";
import { readFileSync, existsSync } from "fs";
import type {
  ManifestConfig,
  ManifestRecord,
  ChromiumFirefoxManifest,
  ManifestPathConfig,
} from "../types.ts";
import type { BrowserTarget } from "../constants.ts";
import { MANIFEST_DIR, MANIFEST_FILE_NAMES } from "../constants.ts";

/** Target for manifest validation: use browser-specific rules (e.g. Firefox MV3 allows background.scripts). */
export type ManifestValidationTarget = Extract<BrowserTarget, "chromium" | "firefox">;

/**
 * Manifest loader: reads manifest from appDir or resolves manifest object/path config from addfox.config.
 */
export class ManifestLoader {
  private readManifestJson(filePath: string): ManifestRecord | null {
    if (!existsSync(filePath)) return null;
    try {
      const raw = readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      return typeof data === "object" && data !== null ? (data as ManifestRecord) : null;
    } catch {
      return null;
    }
  }

  private isManifestPathConfig(
    m: ManifestConfig | ManifestPathConfig | undefined
  ): m is ManifestPathConfig {
    if (!m || typeof m !== "object") return false;
    const c = m as Record<string, unknown>;
    return (
      (typeof c.chromium === "string" || typeof c.firefox === "string") &&
      !("manifest_version" in c) &&
      !("name" in c && "version" in c)
    );
  }

  private isChromiumFirefoxObject(m: ManifestConfig): m is ChromiumFirefoxManifest {
    return isChromiumFirefoxObjectValue(m);
  }

  private deepMerge(base: ManifestRecord, override: ManifestRecord): ManifestRecord {
    const out: ManifestRecord = { ...base };
    for (const key of Object.keys(override)) {
      const b = base[key];
      const o = override[key];
      if (
        o !== null &&
        typeof o === "object" &&
        !Array.isArray(o) &&
        b !== null &&
        typeof b === "object" &&
        !Array.isArray(b)
      ) {
        out[key] = this.deepMerge(b as ManifestRecord, o as ManifestRecord);
      } else {
        out[key] = o;
      }
    }
    return out;
  }

  private loadFromDir(dir: string): {
    base: ManifestRecord | null;
    chromium: ManifestRecord | null;
    firefox: ManifestRecord | null;
  } {
    const basePath = resolve(dir, MANIFEST_FILE_NAMES.base);
    const chromPath = resolve(dir, MANIFEST_FILE_NAMES.chromium);
    const firefoxPath = resolve(dir, MANIFEST_FILE_NAMES.firefox);
    return {
      base: this.readManifestJson(basePath),
      chromium: this.readManifestJson(chromPath),
      firefox: this.readManifestJson(firefoxPath),
    };
  }

  private hasAnyManifest(files: {
    base: ManifestRecord | null;
    chromium: ManifestRecord | null;
    firefox: ManifestRecord | null;
  }): boolean {
    return files.base !== null || files.chromium !== null || files.firefox !== null;
  }

  private buildConfigFromFiles(files: {
    base: ManifestRecord | null;
    chromium: ManifestRecord | null;
    firefox: ManifestRecord | null;
  }): ChromiumFirefoxManifest | null {
    const base = files.base ?? files.chromium ?? files.firefox ?? null;
    if (!base) return null;
    const chromium = files.chromium ? this.deepMerge(base, files.chromium) : base;
    const firefox = files.firefox ? this.deepMerge(base, files.firefox) : base;
    return { chromium, firefox };
  }

  /**
   * Resolve user manifest (object / path / unset) into unified ManifestConfig (object form).
   * Priority: addfox.config manifest > files directly in appDir > files in appDir/manifest/.
   */
  resolve(
    input: ManifestConfig | ManifestPathConfig | undefined,
    root: string,
    appDir: string
  ): ManifestConfig | null {
    if (input === undefined || input === null) {
      const manifestSubdir = resolve(appDir, MANIFEST_DIR);
      const baseInApp = resolve(appDir, MANIFEST_FILE_NAMES.base);
      const baseInSub = resolve(manifestSubdir, MANIFEST_FILE_NAMES.base);
      const dir =
        existsSync(baseInApp)
          ? appDir
          : existsSync(baseInSub)
            ? manifestSubdir
            : null;
      if (dir !== null) {
        const files = this.loadFromDir(dir);
        if (this.hasAnyManifest(files)) {
          return validateAndReturn(this.buildConfigFromFiles(files));
        }
      }
      return null;
    }

    if (this.isManifestPathConfig(input)) {
      const result: ChromiumFirefoxManifest = {};
      if (input.chromium) {
        const obj = this.readManifestJson(resolve(appDir, input.chromium));
        if (obj) result.chromium = obj;
      }
      if (input.firefox) {
        const obj = this.readManifestJson(resolve(appDir, input.firefox));
        if (obj) result.firefox = obj;
      }
      const chrom = result.chromium ?? result.firefox;
      const ff = result.firefox ?? result.chromium;
      if (!chrom && !ff) return null;
      return validateAndReturn({ chromium: chrom ?? {}, firefox: ff ?? {} });
    }

    if (this.isChromiumFirefoxObject(input)) return validateAndReturn(input);
    return validateAndReturn(input);
  }
}

const defaultLoader = new ManifestLoader();

/**
 * Resolve user manifest (object / path / unset) into unified ManifestConfig (object form).
 * Path config is relative to appDir; when unset, reads manifest.json / manifest.chromium.json / manifest.firefox.json from appDir.
 */
export function resolveManifestInput(
  input: ManifestConfig | ManifestPathConfig | undefined,
  root: string,
  appDir: string
): ManifestConfig | null {
  return defaultLoader.resolve(input, root, appDir);
}

function validateAndReturn(config: ManifestConfig | null): ManifestConfig | null {
  if (!config) return null;
  validateManifestSchema(config);
  return config;
}

function validateManifestSchema(config: ManifestConfig): void {
  if (isChromiumFirefoxObjectValue(config)) {
    if (config.chromium) validateManifestRecord(config.chromium, "chromium");
    if (config.firefox) validateManifestRecord(config.firefox, "firefox");
    return;
  }
  validateManifestRecord(config);
}

function isChromiumFirefoxObjectValue(m: ManifestConfig): m is ChromiumFirefoxManifest {
  return typeof m === "object" && m !== null && ("chromium" in m || "firefox" in m);
}

function validateManifestRecord(
  manifest: ManifestRecord,
  target?: ManifestValidationTarget
): void {
  const mv = getManifestVersion(manifest);
  if (mv == null) throw new Error("manifest_version must be 2 or 3");
  const errors =
    mv === 2 ? validateMv2(manifest) : validateMv3(manifest, target);
  if (errors.length > 0) throw new Error(errors.join("; "));
}

function getManifestVersion(manifest: ManifestRecord): 2 | 3 | null {
  const mv = manifest.manifest_version;
  if (mv === 2 || mv === 3) return mv;
  return null;
}

function validateMv2(manifest: ManifestRecord): string[] {
  const errors: string[] = [];
  if (manifest.action != null) {
    errors.push(`MV2 does not support "action"; use "browser_action" or "page_action"`);
  }
  if (manifest.host_permissions != null) {
    errors.push(`MV2 does not support "host_permissions"; use "permissions"`);
  }
  errors.push(...validateBackgroundMv2(manifest.background));
  errors.push(...validatePermissionsList(manifest.permissions, "permissions"));
  return errors;
}

function validateMv3(
  manifest: ManifestRecord,
  target?: ManifestValidationTarget
): string[] {
  const errors: string[] = [];
  if (manifest.browser_action != null || manifest.page_action != null) {
    errors.push(`MV3 does not support "browser_action" or "page_action"; use "action"`);
  }
  const bgErrors =
    target === "firefox"
      ? validateBackgroundMv3Firefox(manifest.background)
      : validateBackgroundMv3Chrome(manifest.background);
  errors.push(...bgErrors);
  errors.push(...validatePermissionsList(manifest.permissions, "permissions"));
  errors.push(...validatePermissionsList(manifest.host_permissions, "host_permissions"));
  errors.push(...validateAction(manifest.action));
  return errors;
}

function validateBackgroundMv2(background: unknown): string[] {
  const errors: string[] = [];
  if (!background) return errors;
  if (typeof background !== "object") {
    errors.push(`MV2 "background" must be an object`);
    return errors;
  }
  const bg = background as { service_worker?: unknown; scripts?: unknown; page?: unknown };
  if (bg.service_worker != null) {
    errors.push(`MV2 "background.service_worker" is not allowed`);
  }
  if (bg.scripts != null && !isStringArray(bg.scripts)) {
    errors.push(`MV2 "background.scripts" must be string[]`);
  }
  if (bg.page != null && typeof bg.page !== "string") {
    errors.push(`MV2 "background.page" must be a string`);
  }
  return errors;
}

/** Chrome MV3: only background.service_worker (string); scripts/page not supported. */
function validateBackgroundMv3Chrome(background: unknown): string[] {
  const errors: string[] = [];
  if (!background) return errors;
  if (typeof background !== "object") {
    errors.push(`MV3 (Chrome) "background" must be an object`);
    return errors;
  }
  const bg = background as { service_worker?: unknown; scripts?: unknown; page?: unknown };
  if (bg.scripts != null) {
    errors.push(`MV3 (Chrome) "background.scripts" is not allowed; use "service_worker"`);
  }
  if (bg.page != null) {
    errors.push(`MV3 (Chrome) "background.page" is not allowed; use "service_worker"`);
  }
  if (bg.service_worker != null && typeof bg.service_worker !== "string") {
    errors.push(`MV3 (Chrome) "background.service_worker" must be a string`);
  }
  return errors;
}

/** Firefox MV3: background.scripts (string[]) or background.page (string); service_worker not supported by Firefox but allowed for cross-browser manifests. */
function validateBackgroundMv3Firefox(background: unknown): string[] {
  const errors: string[] = [];
  if (!background) return errors;
  if (typeof background !== "object") {
    errors.push(`MV3 (Firefox) "background" must be an object`);
    return errors;
  }
  const bg = background as { service_worker?: unknown; scripts?: unknown; page?: unknown };
  const hasScripts = bg.scripts != null;
  const hasPage = bg.page != null;
  const hasServiceWorker = bg.service_worker != null;
  if (!hasScripts && !hasPage && !hasServiceWorker) {
    return errors;
  }
  if (hasScripts && !isStringArray(bg.scripts)) {
    errors.push(`MV3 (Firefox) "background.scripts" must be string[]`);
  }
  if (hasPage && typeof bg.page !== "string") {
    errors.push(`MV3 (Firefox) "background.page" must be a string`);
  }
  if (hasServiceWorker && typeof bg.service_worker !== "string") {
    errors.push(`MV3 (Firefox) "background.service_worker" must be a string when present`);
  }
  if (hasPage && hasScripts) {
    errors.push(`MV3 (Firefox) "background" cannot have both "page" and "scripts"`);
  }
  return errors;
}

function validateAction(action: unknown): string[] {
  if (action == null) return [];
  if (typeof action !== "object") return [`"action" must be an object`];
  const act = action as { default_popup?: unknown };
  if (act.default_popup != null && typeof act.default_popup !== "string") {
    return [`"action.default_popup" must be a string`];
  }
  return [];
}

function validatePermissionsList(value: unknown, key: string): string[] {
  if (value == null) return [];
  return isStringArray(value) ? [] : [`"${key}" must be string[]`];
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
