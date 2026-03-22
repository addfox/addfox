import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "@rstest/core";
import { applyStyleEngine } from "../src/scaffold/style.ts";

describe("scaffold style", () => {
  it("applyStyleEngine writes tailwind postcss and import in entries", () => {
    const dir = mkdtempSync(join(tmpdir(), "addfox-style-"));
    try {
      const app = join(dir, "app", "popup");
      mkdirSync(app, { recursive: true });
      writeFileSync(
        join(dir, "package.json"),
        JSON.stringify(
          {
            name: "t",
            version: "1.0.0",
            private: true,
            type: "module",
            scripts: {},
            dependencies: {},
            devDependencies: {},
          },
          null,
          2
        ),
        "utf-8"
      );
      writeFileSync(join(app, "index.tsx"), `import App from "./App";\n`, "utf-8");

      applyStyleEngine(dir, "react", "ts", "tailwindcss");

      expect(readFileSync(join(dir, "postcss.config.mjs"), "utf8")).toContain("@tailwindcss/postcss");
      expect(readFileSync(join(app, "index.tsx"), "utf8")).toContain("../styles/global.css");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("applyStyleEngine with none leaves project unchanged", () => {
    const dir = mkdtempSync(join(tmpdir(), "addfox-style-none-"));
    try {
      const app = join(dir, "app", "popup");
      mkdirSync(app, { recursive: true });
      const pkgJson = JSON.stringify(
        {
          name: "t",
          version: "1.0.0",
          private: true,
          type: "module",
          scripts: {},
          dependencies: {},
          devDependencies: {},
        },
        null,
        2
      );
      writeFileSync(join(dir, "package.json"), pkgJson, "utf-8");
      const entrySrc = `import App from "./App";\n`;
      writeFileSync(join(app, "index.tsx"), entrySrc, "utf-8");

      applyStyleEngine(dir, "react", "ts", "none");

      expect(existsSync(join(dir, "postcss.config.mjs"))).toBe(false);
      expect(readFileSync(join(dir, "package.json"), "utf8")).toBe(pkgJson);
      expect(readFileSync(join(app, "index.tsx"), "utf8")).toBe(entrySrc);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
