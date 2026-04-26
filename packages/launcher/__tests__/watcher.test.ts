import { describe, it, expect, beforeEach, afterEach } from "@rstest/core";
import { watchFiles } from "../src/shared/watcher";
import { mkdtempSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("watcher", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "launcher-test-"));
  });

  afterEach(() => {
    // cleanup not strictly needed for tmp files in tests
  });

  it("detects file changes", (done) => {
    const file = join(tmpDir, "test.txt");
    writeFileSync(file, "hello");

    const watcher = watchFiles({
      paths: [tmpDir],
      onChange: (path, event) => {
        if (path.endsWith("test.txt")) {
          expect(event).toBe("change");
          watcher.close();
          done();
        }
      },
      debounceMs: 50,
    });

    // Trigger change after watcher is set up
    setTimeout(() => {
      writeFileSync(file, "world");
    }, 100);
  });

  it("closes cleanly", () => {
    const watcher = watchFiles({
      paths: [tmpDir],
      onChange: () => {},
    });
    expect(() => watcher.close()).not.toThrow();
  });
});
