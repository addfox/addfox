#!/usr/bin/env node
import { runCLI } from './cli/index.js';
import { getDB } from './core/db.js';

async function main() {
  // Initialize database
  const db = getDB();
  await db.init();

  // Run CLI
  await runCLI(process.argv);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
