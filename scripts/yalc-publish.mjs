#!/usr/bin/env node
/**
 * Yalc publish script for all packages
 * Usage: pnpm run packages:yalc
 */

import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { existsSync, readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

// List of all packages to publish (relative to packages/)
const packages = [
  "addfox",
  "cli",
  "common",
  "core",
  "create-addfox-app",
  "pkg-manager",
  "utils",
  "plugins/rsbuild-plugin-extension-entry",
  "plugins/rsbuild-plugin-extension-hmr",
  "plugins/rsbuild-plugin-extension-manifest",
  "plugins/rsbuild-plugin-extension-monitor",
  "plugins/rsbuild-plugin-vue",
];

function runYalcPublish(packagePath) {
  const fullPath = resolve(rootDir, "packages", packagePath);
  
  if (!existsSync(fullPath)) {
    console.warn(`⚠️  Skipping ${packagePath} (not found)`);
    return;
  }

  const pkgJsonPath = resolve(fullPath, "package.json");
  if (!existsSync(pkgJsonPath)) {
    console.warn(`⚠️  Skipping ${packagePath} (no package.json)`);
    return;
  }

  // Read package name
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
  const pkgName = pkgJson.name;

  console.log(`\n📦 Publishing ${pkgName}...`);
  
  try {
    execSync("yalc publish", {
      cwd: fullPath,
      stdio: "inherit",
    });
    console.log(`✅ Published ${pkgName}`);
  } catch (error) {
    console.error(`❌ Failed to publish ${pkgName}`);
    process.exit(1);
  }
}

console.log("🚀 Starting yalc publish for all packages...\n");

for (const pkg of packages) {
  runYalcPublish(pkg);
}

console.log("\n🎉 All packages published to yalc!");
