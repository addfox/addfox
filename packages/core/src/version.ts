import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

/**
 * Find package.json by checking multiple possible locations.
 * - From dist/esm: ../../package.json
 * - From src: ../package.json
 */
function findPackageJson(): { version?: string } {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  
  // Try dist/esm location first
  const distPath = resolve(__dirname, "../../package.json");
  if (existsSync(distPath)) {
    return require(distPath);
  }
  
  // Try src location (for tests)
  const srcPath = resolve(__dirname, "../package.json");
  if (existsSync(srcPath)) {
    return require(srcPath);
  }
  
  // Fallback
  return {};
}

const pkg = findPackageJson();

/**
 * Current addfox (core) version, e.g. for extension error reports.
 */
export function getAddfoxVersion(): string {
  return pkg?.version ?? "0.0.0";
}
