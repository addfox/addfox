#!/usr/bin/env node
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Use built version
const entryPoint = resolve(__dirname, '../dist/cli.js');

await import(entryPoint);
