import { describe, it, expect } from "@rstest/core";
import { extractEntriesFromManifest } from "../src/entry/manifestParser.js";

describe("manifestParser content_scripts branches", () => {
  it("should return null when no content_scripts present", () => {
    const manifest = {
      manifest_version: 3,
      name: "test",
      version: "1.0",
    };
    const result = extractEntriesFromManifest(manifest as any, "chrome");
    expect(result.entries).not.toHaveProperty("content");
  });

  it("should return null when content_scripts is empty array", () => {
    const manifest = {
      manifest_version: 3,
      name: "test",
      version: "1.0",
      content_scripts: [],
    };
    const result = extractEntriesFromManifest(manifest as any, "chrome");
    expect(result.entries).not.toHaveProperty("content");
  });

  it("should return null when content_scripts has no js array", () => {
    const manifest = {
      manifest_version: 3,
      name: "test",
      version: "1.0",
      content_scripts: [{ matches: ["<all_urls>"] }],
    };
    const result = extractEntriesFromManifest(manifest as any, "chrome");
    expect(result.entries).not.toHaveProperty("content");
  });

  it("should return null when content_scripts js array has no source files", () => {
    const manifest = {
      manifest_version: 3,
      name: "test",
      version: "1.0",
      content_scripts: [{ 
        matches: ["<all_urls>"],
        js: ["/dist/content.js", "not-a-source-file.ext"]
      }],
    };
    const result = extractEntriesFromManifest(manifest as any, "chrome");
    expect(result.entries).not.toHaveProperty("content");
  });

  it("should extract content script from second content_scripts entry", () => {
    const manifest = {
      manifest_version: 3,
      name: "test",
      version: "1.0",
      content_scripts: [
        { matches: ["<all_urls>"], js: ["/dist/first.js"] },
        { matches: ["<all_urls>"], js: ["./src/content.ts"] }
      ],
    };
    const result = extractEntriesFromManifest(manifest as any, "chrome");
    expect(result.entries["content"]).toBe("src/content.ts");
    expect(result.replacementMap.get("content_scripts[1].js[0]")).toBe("content");
  });

  it("should extract content script from second js entry in first content_scripts", () => {
    const manifest = {
      manifest_version: 3,
      name: "test",
      version: "1.0",
      content_scripts: [
        { 
          matches: ["<all_urls>"], 
          js: ["/dist/first.js", "./src/content.ts"] 
        },
      ],
    };
    const result = extractEntriesFromManifest(manifest as any, "chrome");
    expect(result.entries["content"]).toBe("src/content.ts");
    expect(result.replacementMap.get("content_scripts[0].js[1]")).toBe("content");
  });
});
