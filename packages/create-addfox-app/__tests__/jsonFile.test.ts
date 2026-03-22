import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "@rstest/core";
import { readJsonFile, stripUtf8Bom, writeJsonFile } from "../src/lib/jsonFile.ts";

describe("jsonFile", () => {
  it("stripUtf8Bom removes leading BOM", () => {
    const bom = "\uFEFF";
    expect(stripUtf8Bom(`${bom}{"a":1}`)).toBe('{"a":1}');
    expect(stripUtf8Bom('{"a":1}')).toBe('{"a":1}');
  });

  it("readJsonFile parses package.json with UTF-8 BOM", () => {
    const dir = mkdtempSync(join(tmpdir(), "addfox-json-"));
    try {
      const p = join(dir, "package.json");
      writeFileSync(p, `\uFEFF${JSON.stringify({ name: "x", version: "1.0.0" })}`, "utf8");
      const pkg = readJsonFile<{ name: string }>(p);
      expect(pkg.name).toBe("x");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("writeJsonFile round-trips", () => {
    const dir = mkdtempSync(join(tmpdir(), "addfox-json-w-"));
    try {
      const p = join(dir, "t.json");
      writeJsonFile(p, { ok: true });
      expect(JSON.parse(readFileSync(p, "utf8"))).toEqual({ ok: true });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
