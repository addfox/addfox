import { describe, expect, it, beforeEach, afterEach } from "@rstest/core";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { createWriteStream } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { crc32, zipDirectory } from "../src/lib/zip.ts";

/* ─── helpers to validate ZIP format ─── */

function findEOCD(buf: Buffer): { cdOffset: number; cdSize: number; numEntries: number } | null {
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      return {
        numEntries: buf.readUInt16LE(i + 8),
        cdSize: buf.readUInt32LE(i + 12),
        cdOffset: buf.readUInt32LE(i + 16),
      };
    }
  }
  return null;
}

interface ZipEntry {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  crc: number;
  localHeaderOffset: number;
}

function readCentralDirectory(buf: Buffer): ZipEntry[] {
  const eocd = findEOCD(buf);
  if (!eocd) throw new Error("EOCD not found");

  const entries: ZipEntry[] = [];
  let offset = eocd.cdOffset;

  for (let i = 0; i < eocd.numEntries; i++) {
    if (buf.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("Invalid central directory signature");
    }
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const name = buf.toString("utf-8", offset + 46, offset + 46 + nameLen);
    entries.push({
      name,
      compressedSize: buf.readUInt32LE(offset + 20),
      uncompressedSize: buf.readUInt32LE(offset + 24),
      crc: buf.readUInt32LE(offset + 16),
      localHeaderOffset: buf.readUInt32LE(offset + 42),
    });
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function extractFileData(buf: Buffer, entry: ZipEntry): Buffer {
  const localSig = buf.readUInt32LE(entry.localHeaderOffset);
  if (localSig !== 0x04034b50) {
    throw new Error("Invalid local file header signature");
  }
  const nameLen = buf.readUInt16LE(entry.localHeaderOffset + 26);
  const extraLen = buf.readUInt16LE(entry.localHeaderOffset + 28);
  const dataOffset = entry.localHeaderOffset + 30 + nameLen + extraLen;
  const compressed = buf.subarray(dataOffset, dataOffset + entry.compressedSize);
  return inflateRawSync(compressed);
}

/* ─── tests ─── */

describe("crc32", () => {
  it("matches known CRC-32 values", () => {
    expect(crc32(Buffer.from(""))).toBe(0);
    expect(crc32(Buffer.from("hello"))).toBe(0x3610a686);
    expect(crc32(Buffer.from("The quick brown fox jumps over the lazy dog"))).toBe(0x414fa339);
  });
});

describe("zipDirectory", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = resolve(tmpdir(), `addfox-zip-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
  });

  it("produces a valid ZIP with correct entries", async () => {
    const srcDir = resolve(testDir, "src");
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(resolve(srcDir, "a.txt"), "hello", "utf-8");
    writeFileSync(resolve(srcDir, "b.txt"), "world", "utf-8");

    const zipPath = resolve(testDir, "out.zip");
    const output = createWriteStream(zipPath);
    await zipDirectory(srcDir, output);

    const buf = readFileSync(zipPath);
    const entries = readCentralDirectory(buf);
    expect(entries.length).toBe(2);
    expect(entries.map((e) => e.name).sort()).toEqual(["a.txt", "b.txt"]);

    const aEntry = entries.find((e) => e.name === "a.txt")!;
    const bEntry = entries.find((e) => e.name === "b.txt")!;

    expect(aEntry.crc).toBe(crc32(Buffer.from("hello")));
    expect(bEntry.crc).toBe(crc32(Buffer.from("world")));

    expect(extractFileData(buf, aEntry).toString("utf-8")).toBe("hello");
    expect(extractFileData(buf, bEntry).toString("utf-8")).toBe("world");
  });

  it("flattens nested directories with forward-slash paths", async () => {
    const srcDir = resolve(testDir, "src");
    const nested = resolve(srcDir, "nested", "deep");
    mkdirSync(nested, { recursive: true });
    writeFileSync(resolve(nested, "file.txt"), "deep content", "utf-8");

    const zipPath = resolve(testDir, "out.zip");
    const output = createWriteStream(zipPath);
    await zipDirectory(srcDir, output);

    const buf = readFileSync(zipPath);
    const entries = readCentralDirectory(buf);
    expect(entries.length).toBe(1);
    expect(entries[0].name).toBe("nested/deep/file.txt");
    expect(entries[0].name).not.toContain("\\");
  });

  it("handles binary data correctly", async () => {
    const srcDir = resolve(testDir, "src");
    mkdirSync(srcDir, { recursive: true });
    const binary = Buffer.from([0x00, 0x01, 0xff, 0xfe, 0xfd]);
    writeFileSync(resolve(srcDir, "bin.dat"), binary);

    const zipPath = resolve(testDir, "out.zip");
    const output = createWriteStream(zipPath);
    await zipDirectory(srcDir, output);

    const buf = readFileSync(zipPath);
    const entries = readCentralDirectory(buf);
    expect(entries[0].crc).toBe(crc32(binary));
    expect(extractFileData(buf, entries[0]).equals(binary)).toBe(true);
  });

  it("creates an empty ZIP for an empty directory", async () => {
    const srcDir = resolve(testDir, "empty");
    mkdirSync(srcDir, { recursive: true });

    const zipPath = resolve(testDir, "out.zip");
    const output = createWriteStream(zipPath);
    await zipDirectory(srcDir, output);

    const buf = readFileSync(zipPath);
    const entries = readCentralDirectory(buf);
    expect(entries.length).toBe(0);
  });

  it("honors compression level option", async () => {
    const srcDir = resolve(testDir, "src");
    mkdirSync(srcDir, { recursive: true });
    // Highly repetitive data compresses well
    const data = "a".repeat(10000);
    writeFileSync(resolve(srcDir, "big.txt"), data, "utf-8");

    const zipPath9 = resolve(testDir, "out9.zip");
    await zipDirectory(srcDir, createWriteStream(zipPath9), { level: 9 });

    const zipPath0 = resolve(testDir, "out0.zip");
    await zipDirectory(srcDir, createWriteStream(zipPath0), { level: 0 });

    const size9 = readFileSync(zipPath9).length;
    const size0 = readFileSync(zipPath0).length;
    expect(size9).toBeLessThan(size0);
  });
});
