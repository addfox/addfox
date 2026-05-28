import { createWriteStream, mkdirSync, existsSync } from "fs";
import { resolve } from "path";
import type { Writable } from "stream";
import type { AddfoxErrorCode } from "@addfox/common";
import { AddfoxError } from "@addfox/common";
import { ADDFOX_OUTPUT_ROOT, type BrowserTarget, getBrowserOutputDir } from "@addfox/core";
import { zipDirectory } from "../lib/zip";

/** Error codes for zip operations; match core ADDFOX_ERROR_CODES */
const ZIP_OUTPUT_CODE = "ADDFOX_ZIP_OUTPUT" as AddfoxErrorCode;
const ZIP_ARCHIVE_CODE = "ADDFOX_ZIP_ARCHIVE" as AddfoxErrorCode;

/** Default zlib level for zip compression */
const ZIP_LEVEL = 9;

/** Optional for tests: inject stream/zipper to trigger error paths */
export type ZipDistDeps = {
  createWriteStream?: typeof createWriteStream;
  zipDirectory?: typeof zipDirectory;
  mkdirSync?: typeof mkdirSync;
  existsSync?: typeof existsSync;
};

/**
 * Packs the built output directory into a zip file.
 * Output: root/.addfox/<outDir>/<outDir>-<browser>.zip (browser-specific zip inside .addfox/<outDir>).
 * Zip contents are the files inside distPath (no extra top-level folder).
 */
export function zipDist(
  distPath: string,
  root: string,
  outDir: string,
  browser?: BrowserTarget,
  deps?: ZipDistDeps
): Promise<string> {
  const createStream = deps?.createWriteStream ?? createWriteStream;
  const zipFn = deps?.zipDirectory ?? zipDirectory;
  const mkdir = deps?.mkdirSync ?? mkdirSync;
  const exists = deps?.existsSync ?? existsSync;
  const outputRoot = ADDFOX_OUTPUT_ROOT;
  // Zip file goes to .addfox/<outDir>/<outDir>-<browser>.zip
  const zipDir = resolve(root, outputRoot, outDir);
  if (!exists(zipDir)) mkdir(zipDir, { recursive: true });
  const browserSuffix = browser ? `-${browser}` : "";
  const zipPath = resolve(zipDir, `${outDir}${browserSuffix}.zip`);
  const output = createStream(zipPath);

  return new Promise((resolvePromise, reject) => {
    output.on("error", (err) =>
      reject(
        new AddfoxError({
          message: "Zip output stream failed",
          code: ZIP_OUTPUT_CODE,
          details: err instanceof Error ? err.message : String(err),
          cause: err,
        })
      )
    );

    zipFn(distPath, output as Writable, { level: ZIP_LEVEL })
      .then(() => resolvePromise(zipPath))
      .catch((err: unknown) =>
        reject(
          new AddfoxError({
            message: "Zip archive failed",
            code: ZIP_ARCHIVE_CODE,
            details: err instanceof Error ? err.message : String(err),
            cause: err instanceof Error ? err : undefined,
          })
        )
      );
  });
}
