import { resolve, dirname } from "path";
import { existsSync, readFileSync } from "fs";
import { spawnSync } from "child_process";
import { createRequire } from "module";
import { exitWithError, AddfoxError, ADDFOX_ERROR_CODES } from "@addfox/common";
import { getResolvedRstestConfigFilePath } from "@addfox/core";
import {
  detectFromLockfile,
  getAddCommand,
  getMissingPackages,
} from "@addfox/pkg-manager";

const require = createRequire(import.meta.url);

function hasRstestConfigFile(projectRoot: string): boolean {
  return getResolvedRstestConfigFilePath(projectRoot) !== null;
}

/** Detect browser.enabled from rstest config via regex (avoids loading .ts). */
function isRstestBrowserEnabled(projectRoot: string): boolean {
  const configPath = getResolvedRstestConfigFilePath(projectRoot);
  if (!configPath) return false;
  try {
    const content = readFileSync(configPath, "utf-8");
    return (
      /browser\s*:\s*\{[^}]*enabled\s*:\s*true/.test(content) ||
      /browser\.enabled\s*===?\s*true/.test(content)
    );
  } catch {
    return false;
  }
}

function getRequiredTestPackages(projectRoot: string): string[] {
  const required: string[] = ["@rstest/core"];
  if (isRstestBrowserEnabled(projectRoot)) {
    required.push("@rstest/browser", "playwright");
  }
  return required;
}

function getRstestBinPath(projectRoot: string): string {
  const binDir = resolve(projectRoot, "node_modules", ".bin");
  const name = process.platform === "win32" ? "rstest.cmd" : "rstest";
  const p = resolve(binDir, name);
  if (existsSync(p)) return p;
  const fallback = resolve(binDir, "rstest");
  if (existsSync(fallback)) return fallback;
  try {
    const corePkgPath = require.resolve("@rstest/core/package.json", {
      paths: [projectRoot],
    });
    const coreDir = dirname(corePkgPath);
    const binInCore = resolve(coreDir, "bin", "rstest.js");
    if (existsSync(binInCore)) return binInCore;
  } catch {
    /* fall through to exitWithError */
  }
  exitWithError(
    new Error(
      "rstest binary not found in node_modules/.bin after installing @rstest/core"
    )
  );
}

function runRstest(projectRoot: string, restArgs: string[]): number {
  const rstestBin = getRstestBinPath(projectRoot);
  const result = spawnSync(rstestBin, restArgs, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return result.status ?? 0;
}

/**
 * Run addfox test: ensure rstest config exists, install missing deps, forward to rstest.
 */
export async function runTest(projectRoot: string, argv: string[]): Promise<void> {
  if (!hasRstestConfigFile(projectRoot)) {
    const files = "rstest.config.cts, rstest.config.mts, rstest.config.cjs, rstest.config.js, rstest.config.ts, rstest.config.mjs";
    throw new AddfoxError({
      code: ADDFOX_ERROR_CODES.RSTEST_CONFIG_NOT_FOUND,
      message: "Rstest config file not found",
      details: `No rstest.config.* found under ${projectRoot}`,
      hint: `Create one of: ${files}`,
    });
  }

  const required = getRequiredTestPackages(projectRoot);
  const missing = getMissingPackages(projectRoot, required);
  if (missing.length > 0) {
    const pm = detectFromLockfile(projectRoot);
    const installCmd = getAddCommand(pm, missing.join(" "), true);
    exitWithError(
      new Error(
        `Missing test dependencies: ${missing.join(", ")}. Please run:\n  ${installCmd}`
      )
    );
  }

  const restArgs = argv.slice(1);
  const code = runRstest(projectRoot, restArgs);
  process.exit(code);
}
