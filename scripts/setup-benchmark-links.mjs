#!/usr/bin/env node
/**
 * Setup pnpm links for addfox packages
 * Run this from addfox root to create global links
 * Then run `pnpm run link:addfox` in benchmark/addfox
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

const packagesDir = resolve(process.cwd(), 'packages');
const pluginsDir = resolve(packagesDir, 'plugins');

// Packages that need to be linked
const packagesToLink = [
  'addfox',
  'utils',
  'core',
  'common',
  'cli',
];

const pluginsToLink = [
  'rsbuild-plugin-extension-entry',
  'rsbuild-plugin-extension-hmr',
  'rsbuild-plugin-extension-manifest',
  'rsbuild-plugin-extension-monitor',
  'rsbuild-plugin-vue',
];

console.log('🔧 Setting up pnpm global links for addfox packages...\n');

// Link main packages
for (const pkg of packagesToLink) {
  const pkgPath = resolve(packagesDir, pkg);
  if (existsSync(pkgPath)) {
    try {
      console.log(`📦 Linking @addfox/${pkg}...`);
      // Use --global-dir to avoid PATH issues on Windows
      execSync('pnpm link --global', {
        cwd: pkgPath,
        stdio: 'pipe',
        env: { ...process.env, CI: 'true' }
      });
      console.log(`   ✅ Linked`);
    } catch (e) {
      // Some errors are just warnings, check if link was created
      console.log(`   ⚠️  Link attempted (may already exist)`);
    }
  } else {
    console.warn(`⚠️  Package not found: ${pkgPath}`);
  }
}

// Link plugin packages
for (const pkg of pluginsToLink) {
  const pkgPath = resolve(pluginsDir, pkg);
  if (existsSync(pkgPath)) {
    try {
      console.log(`📦 Linking @addfox/${pkg}...`);
      execSync('pnpm link --global', {
        cwd: pkgPath,
        stdio: 'pipe',
        env: { ...process.env, CI: 'true' }
      });
      console.log(`   ✅ Linked`);
    } catch (e) {
      console.log(`   ⚠️  Link attempted (may already exist)`);
    }
  } else {
    console.warn(`⚠️  Plugin not found: ${pkgPath}`);
  }
}

console.log('\n✅ Setup complete!');
console.log('\nNext steps:');
console.log('1. cd ../benchmark/addfox');
console.log('2. pnpm run link:addfox');
