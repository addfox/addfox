/**
 * Read/write JSON files; strips UTF-8 BOM on read so JSON.parse never fails.
 */

import { readFileSync, writeFileSync } from "node:fs";

const UTF8_BOM = "\uFEFF";

export function stripUtf8Bom(text: string): string {
  return text.startsWith(UTF8_BOM) ? text.slice(UTF8_BOM.length) : text;
}

export function readJsonFile<T = unknown>(path: string): T {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(stripUtf8Bom(raw)) as T;
}

export function writeJsonFile(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
}
