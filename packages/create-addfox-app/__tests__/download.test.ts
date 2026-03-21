import { describe, expect, it } from "@rstest/core";
import { existsSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { parseTarHeader, extractMatchingFiles } from "../src/download.ts";
import type { TarHeader } from "../src/download.ts";

const TEST_DIR = join(process.cwd(), "__tests__", ".tmp-download-test");

function createTarHeader(name: string, size: number, type: string): Buffer {
  const header = Buffer.alloc(512, 0);

  header.write(name.slice(0, 100), 0, "utf8");
  header.write("0000644\0", 100, "utf8");
  header.write("0001000\0", 108, "utf8");
  header.write("0001000\0", 116, "utf8");

  const sizeOctal = size.toString(8).padStart(11, "0");
  header.write(sizeOctal + "\0", 124, "utf8");
  header.write("00000000000\0", 136, "utf8");

  header[156] = type.charCodeAt(0);
  header.write("ustar\0", 257, "utf8");
  header.write("00", 263, "utf8");

  header.write("        ", 148, "utf8");
  let checksum = 0;
  for (let i = 0; i < 512; i++) checksum += header[i];
  const checksumStr = checksum.toString(8).padStart(6, "0") + "\0 ";
  header.write(checksumStr, 148, "utf8");

  return header;
}

function createTarEntry(name: string, content: string): Buffer {
  const data = Buffer.from(content, "utf8");
  const header = createTarHeader(name, data.length, "0");
  const paddedSize = Math.ceil(data.length / 512) * 512;
  const dataBuf = Buffer.alloc(paddedSize, 0);
  data.copy(dataBuf);
  return Buffer.concat([header, dataBuf]);
}

function createTarDirEntry(name: string): Buffer {
  return createTarHeader(name.endsWith("/") ? name : name + "/", 0, "5");
}

function buildTarGzBuffer(entries: Buffer[]): Buffer {
  const endBlock = Buffer.alloc(1024, 0);
  const tar = Buffer.concat([...entries, endBlock]);
  return gzipSync(tar);
}

function cleanTestDir(): void {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
}

describe("download", () => {
  describe("parseTarHeader", () => {
    it("returns null for an all-zero block", () => {
      const buf = Buffer.alloc(512, 0);
      expect(parseTarHeader(buf)).toBeNull();
    });

    it("parses a valid file header", () => {
      const header = createTarHeader("hello.txt", 5, "0");
      const result = parseTarHeader(header) as TarHeader;
      expect(result).not.toBeNull();
      expect(result.name).toBe("hello.txt");
      expect(result.size).toBe(5);
      expect(result.type).toBe("0");
    });

    it("parses a directory header", () => {
      const header = createTarHeader("mydir/", 0, "5");
      const result = parseTarHeader(header) as TarHeader;
      expect(result).not.toBeNull();
      expect(result.name).toBe("mydir/");
      expect(result.type).toBe("5");
      expect(result.size).toBe(0);
    });

    it("handles ustar prefix field", () => {
      const header = Buffer.alloc(512, 0);
      header.write("file.txt", 0, "utf8");
      header.write("00000005\0", 124, "utf8");
      header[156] = "0".charCodeAt(0);
      header.write("long/prefix/path", 345, "utf8");
      const result = parseTarHeader(header) as TarHeader;
      expect(result.name).toBe("long/prefix/path/file.txt");
    });
  });

  describe("extractMatchingFiles", () => {
    it("extracts files matching the prefix", () => {
      cleanTestDir();
      const tar = Buffer.concat([
        createTarEntry("repo-main/templates/react-ts/package.json", '{"name":"test"}'),
        createTarEntry("repo-main/templates/react-ts/app/index.ts", "console.log('hi');"),
        createTarEntry("repo-main/templates/vue-ts/package.json", '{"name":"vue"}'),
        Buffer.alloc(1024, 0),
      ]);

      extractMatchingFiles(tar, "templates/react-ts/", TEST_DIR);

      expect(existsSync(join(TEST_DIR, "package.json"))).toBe(true);
      expect(existsSync(join(TEST_DIR, "app", "index.ts"))).toBe(true);
      expect(readFileSync(join(TEST_DIR, "package.json"), "utf8")).toBe('{"name":"test"}');
      expect(readFileSync(join(TEST_DIR, "app", "index.ts"), "utf8")).toBe("console.log('hi');");

      expect(existsSync(join(TEST_DIR, "templates"))).toBe(false);

      cleanTestDir();
    });

    it("creates directories for type 5 entries", () => {
      cleanTestDir();
      const tar = Buffer.concat([
        createTarDirEntry("repo-main/tpl/mydir/"),
        createTarEntry("repo-main/tpl/mydir/file.txt", "hello"),
        Buffer.alloc(1024, 0),
      ]);

      extractMatchingFiles(tar, "tpl/", TEST_DIR);

      expect(existsSync(join(TEST_DIR, "mydir"))).toBe(true);
      expect(readFileSync(join(TEST_DIR, "mydir", "file.txt"), "utf8")).toBe("hello");

      cleanTestDir();
    });

    it("ignores entries not matching the prefix", () => {
      cleanTestDir();
      const tar = Buffer.concat([
        createTarEntry("repo-main/other/file.txt", "should not extract"),
        Buffer.alloc(1024, 0),
      ]);

      extractMatchingFiles(tar, "templates/react-ts/", TEST_DIR);

      expect(existsSync(join(TEST_DIR, "file.txt"))).toBe(false);

      cleanTestDir();
    });

    it("skips the prefix directory entry itself (empty relativePath)", () => {
      cleanTestDir();
      const tar = Buffer.concat([
        createTarDirEntry("repo-main/tpl/"),
        createTarEntry("repo-main/tpl/file.txt", "content"),
        Buffer.alloc(1024, 0),
      ]);

      extractMatchingFiles(tar, "tpl/", TEST_DIR);

      expect(readFileSync(join(TEST_DIR, "file.txt"), "utf8")).toBe("content");

      cleanTestDir();
    });

    it("extracts files with null type byte as regular files", () => {
      cleanTestDir();
      const header = createTarHeader("repo-main/tpl/null-type.txt", 4, "\0");
      const data = Buffer.alloc(512, 0);
      Buffer.from("test").copy(data);

      const tar = Buffer.concat([header, data, Buffer.alloc(1024, 0)]);

      extractMatchingFiles(tar, "tpl/", TEST_DIR);

      expect(existsSync(join(TEST_DIR, "null-type.txt"))).toBe(true);
      expect(readFileSync(join(TEST_DIR, "null-type.txt"), "utf8")).toBe("test");

      cleanTestDir();
    });
  });
});
