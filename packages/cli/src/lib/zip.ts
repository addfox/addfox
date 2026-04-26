/**
 * Lightweight ZIP archiver using only Node.js built-ins.
 * Replaces the `archiver` npm package to reduce supply-chain risk.
 */

import { createReadStream, readdirSync, statSync } from "node:fs";
import { relative, join } from "node:path";
import { createDeflateRaw } from "node:zlib";
import type { Writable } from "node:stream";

/* ─── CRC-32 (pure JS, based on IEEE 802.3 polynomial) ─── */

function makeCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
}

const CRC32_TABLE = makeCrc32Table();

/** @internal exported for tests */
export function crc32(buffer: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buffer.length; i++) {
    c = CRC32_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return ~c >>> 0;
}

/* ─── Little-endian helpers ─── */

function writeUInt32LE(b: Buffer, val: number, off: number): void {
  b.writeUInt32LE(val >>> 0, off);
}

function writeUInt16LE(b: Buffer, val: number, off: number): void {
  b.writeUInt16LE(val & 0xffff, off);
}

/* ─── ZIP constants ─── */

const LOCAL_FILE_HEADER_SIG = 0x04034b50;
const CENTRAL_DIR_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;
const VERSION_NEEDED = 20;
const METHOD_DEFLATE = 8;

interface FileEntry {
  relativePath: string;
  crc: number;
  compressed: Buffer;
  uncompressedSize: number;
  compressedSize: number;
  localHeaderOffset: number;
}

async function deflateBuffer(data: Buffer, level: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const deflate = createDeflateRaw({ level });
    deflate.on("data", (chunk: Buffer) => chunks.push(chunk));
    deflate.on("end", () => resolve(Buffer.concat(chunks)));
    deflate.on("error", reject);
    deflate.end(data);
  });
}

function collectFiles(dir: string, base = dir): { relativePath: string; absolutePath: string }[] {
  const entries: { relativePath: string; absolutePath: string }[] = [];
  const items = readdirSync(dir);
  for (const item of items) {
    const absolutePath = join(dir, item);
    const relativePath = relative(base, absolutePath).replace(/\\/g, "/");
    const st = statSync(absolutePath);
    if (st.isDirectory()) {
      entries.push(...collectFiles(absolutePath, base));
    } else {
      entries.push({ relativePath, absolutePath });
    }
  }
  return entries;
}

function writeLocalHeader(entry: FileEntry): Buffer {
  const nameBuf = Buffer.from(entry.relativePath, "utf-8");
  const header = Buffer.alloc(30 + nameBuf.length);
  writeUInt32LE(header, LOCAL_FILE_HEADER_SIG, 0);
  writeUInt16LE(header, VERSION_NEEDED, 4);
  writeUInt16LE(header, 0, 6); // flags
  writeUInt16LE(header, METHOD_DEFLATE, 8);
  writeUInt16LE(header, 0, 10); // time
  writeUInt16LE(header, 0, 12); // date
  writeUInt32LE(header, entry.crc, 14);
  writeUInt32LE(header, entry.compressedSize, 18);
  writeUInt32LE(header, entry.uncompressedSize, 22);
  writeUInt16LE(header, nameBuf.length, 26);
  writeUInt16LE(header, 0, 28); // extra length
  nameBuf.copy(header, 30);
  return header;
}

function writeCentralDirHeader(entry: FileEntry): Buffer {
  const nameBuf = Buffer.from(entry.relativePath, "utf-8");
  const header = Buffer.alloc(46 + nameBuf.length);
  writeUInt32LE(header, CENTRAL_DIR_SIG, 0);
  writeUInt16LE(header, VERSION_NEEDED, 4); // version made by
  writeUInt16LE(header, VERSION_NEEDED, 6); // version needed
  writeUInt16LE(header, 0, 8); // flags
  writeUInt16LE(header, METHOD_DEFLATE, 10);
  writeUInt16LE(header, 0, 12); // time
  writeUInt16LE(header, 0, 14); // date
  writeUInt32LE(header, entry.crc, 16);
  writeUInt32LE(header, entry.compressedSize, 20);
  writeUInt32LE(header, entry.uncompressedSize, 24);
  writeUInt16LE(header, nameBuf.length, 28);
  writeUInt16LE(header, 0, 30); // extra length
  writeUInt16LE(header, 0, 32); // comment length
  writeUInt16LE(header, 0, 34); // disk number
  writeUInt16LE(header, 0, 36); // internal attrs
  writeUInt32LE(header, 0, 38); // external attrs
  writeUInt32LE(header, entry.localHeaderOffset, 42);
  nameBuf.copy(header, 46);
  return header;
}

function writeEOCD(numEntries: number, centralDirSize: number, centralDirOffset: number): Buffer {
  const buf = Buffer.alloc(22);
  writeUInt32LE(buf, EOCD_SIG, 0);
  writeUInt16LE(buf, 0, 4); // disk number
  writeUInt16LE(buf, 0, 6); // disk with CD
  writeUInt16LE(buf, numEntries, 8);
  writeUInt16LE(buf, numEntries, 10);
  writeUInt32LE(buf, centralDirSize, 12);
  writeUInt32LE(buf, centralDirOffset, 16);
  writeUInt16LE(buf, 0, 20); // comment length
  return buf;
}

async function readFileBuffer(path: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = createReadStream(path);
    stream.on("data", (chunk: string | Buffer) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export interface ZipOptions {
  level?: number;
}

/**
 * Writes a ZIP archive of `sourceDir` to the Writable stream `output`.
 * Resolves when the archive is fully written.
 */
export async function zipDirectory(
  sourceDir: string,
  output: Writable,
  options?: ZipOptions
): Promise<void> {
  const level = options?.level ?? 9;
  const files = collectFiles(sourceDir);

  const entries: FileEntry[] = [];
  let offset = 0;

  for (const file of files) {
    const data = await readFileBuffer(file.absolutePath);
    const compressed = await deflateBuffer(data, level);
    const entry: FileEntry = {
      relativePath: file.relativePath,
      crc: crc32(data),
      compressed,
      uncompressedSize: data.length,
      compressedSize: compressed.length,
      localHeaderOffset: offset,
    };

    const localHeader = writeLocalHeader(entry);
    output.write(localHeader);
    output.write(entry.compressed);

    offset += localHeader.length + entry.compressedSize;
    entries.push(entry);
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;

  for (const entry of entries) {
    const cdHeader = writeCentralDirHeader(entry);
    output.write(cdHeader);
    centralDirSize += cdHeader.length;
  }

  const eocd = writeEOCD(entries.length, centralDirSize, centralDirOffset);
  output.write(eocd);

  return new Promise((resolve, reject) => {
    output.on("finish", resolve);
    output.on("error", reject);
    output.end();
  });
}
