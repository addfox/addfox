/**
 * 合并各 package 的 coverage/lcov.info 到根目录 coverage/lcov.info，供 Codecov 等使用。
 * 执行顺序：先运行 pnpm run test:coverage，再运行 node scripts/merge-coverage.mjs
 */
import { readdirSync, mkdirSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packagesDir = join(root, "packages");

function findLcovFiles(dir) {
  const results = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "coverage") {
        const lcov = join(full, "lcov.info");
        if (existsSync(lcov)) results.push(lcov);
      } else if (e.name !== "node_modules" && e.name !== "dist") {
        results.push(...findLcovFiles(full));
      }
    }
  }
  return results;
}

const lcovFiles = findLcovFiles(packagesDir);
if (lcovFiles.length === 0) {
  console.warn("[merge-coverage] No packages/coverage/lcov.info found. Run pnpm run test:coverage first.");
  process.exit(0);
}

const outDir = join(root, "coverage");
const outPath = join(outDir, "lcov.info");
mkdirSync(outDir, { recursive: true });

const pattern = join(packagesDir, "**", "coverage", "lcov.info").replace(/\\/g, "/");
execSync(`npx lcov-result-merger "${pattern}" "${outPath.replace(/\\/g, "/")}"`, {
  cwd: root,
  stdio: "inherit",
});
console.log(`[merge-coverage] Merged ${lcovFiles.length} lcov file(s) -> ${outPath}`);
