import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { cp, mkdir } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const GITHUB_REPO = "addfox/addfox";
const TEMPLATE_BASE = "templates";

/** Resolve addfox repo root (where templates/ lives) when running from packages/create-addfox-app. */
function getRepoRoot(): string {
  const fromDist = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  return fromDist;
}

/**
 * If running inside the addfox repo and templates/<templateName> exists, copy it to destDir.
 * Returns true if local copy was used, false otherwise.
 */
/** True if the addfox repo checkout next to this package has `templates/<name>`. */
export function hasLocalTemplate(templateName: string): boolean {
  const repoRoot = getRepoRoot();
  return existsSync(join(repoRoot, TEMPLATE_BASE, templateName));
}

const SKIP_TEMPLATE_PATH_PARTS = new Set(["node_modules", ".git", ".pnpm"]);

/**
 * Skip dependency trees and VCS when copying a local template. On Windows,
 * copying pnpm's symlinked node_modules requires symlink privileges (EPERM otherwise).
 */
export function shouldCopyLocalTemplatePath(src: string): boolean {
  const normalized = src.split(/[/\\]/);
  for (const part of normalized) {
    if (SKIP_TEMPLATE_PATH_PARTS.has(part)) {
      return false;
    }
  }
  return true;
}

export async function tryLocalTemplates(templateName: string, destDir: string): Promise<boolean> {
  const repoRoot = getRepoRoot();
  const templatePath = join(repoRoot, TEMPLATE_BASE, templateName);
  if (!existsSync(templatePath)) return false;
  await mkdir(destDir, { recursive: true });
  await cp(templatePath, destDir, {
    recursive: true,
    filter: (src) => shouldCopyLocalTemplatePath(src),
  });
  return true;
}

export interface TarHeader {
  name: string;
  size: number;
  type: string;
}

export function parseTarHeader(buf: Buffer): TarHeader | null {
  if (buf.every((b) => b === 0)) return null;

  const rawName = buf.subarray(0, 100).toString("utf8").replace(/\0+$/, "");
  const sizeStr = buf.subarray(124, 136).toString("utf8").replace(/\0+$/, "").trim();
  const type = String.fromCharCode(buf[156]);
  const prefix = buf.subarray(345, 500).toString("utf8").replace(/\0+$/, "");

  return {
    name: prefix ? `${prefix}/${rawName}` : rawName,
    size: parseInt(sizeStr, 8) || 0,
    type,
  };
}

export function extractMatchingFiles(
  tarBuffer: Buffer,
  templatePrefix: string,
  destDir: string,
): void {
  let offset = 0;

  while (offset + 512 <= tarBuffer.length) {
    const header = parseTarHeader(tarBuffer.subarray(offset, offset + 512));
    offset += 512;
    if (!header) break;

    const dataBlocks = Math.ceil(header.size / 512) * 512;
    const idx = header.name.indexOf(templatePrefix);

    if (idx !== -1) {
      const relativePath = header.name.substring(idx + templatePrefix.length).replace(/^\//, "");
      if (relativePath) {
        const destPath = join(destDir, relativePath);
        const isDir = header.type === "5" || relativePath.endsWith("/");

        if (isDir) {
          mkdirSync(destPath, { recursive: true });
        } else if (header.type === "0" || header.type === "\0") {
          mkdirSync(dirname(destPath), { recursive: true });
          writeFileSync(destPath, tarBuffer.subarray(offset, offset + header.size));
        }
      }
    }

    offset += dataBlocks;
  }
}

/* istanbul ignore next -- network I/O, tested via integration */
export async function downloadTemplate(
  templateName: string,
  destDir: string,
  branch = "main",
): Promise<void> {
  const url = `https://codeload.github.com/${GITHUB_REPO}/tar.gz/${branch}`;
  const templatePrefix = `${TEMPLATE_BASE}/${templateName}/`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const compressed = Buffer.from(await response.arrayBuffer());
  const tarBuffer = gunzipSync(compressed);

  mkdirSync(destDir, { recursive: true });
  extractMatchingFiles(tarBuffer, templatePrefix, destDir);
}
