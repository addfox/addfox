import { resolve, dirname } from "path";
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

function readPackageVersion(pkgPath: string): string {
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
    return pkg.version ?? "?";
  } catch {
    return "?";
  }
}

/** Get addfox CLI package version. */
export function getVersion(): string {
  try {
    const pkgPath = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "package.json"
    );
    return readPackageVersion(pkgPath) || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** Get @rsbuild/core version from project or monorepo. */
export function getRsbuildVersion(projectRoot: string): string {
  const cliDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    () => {
      const p = resolve(projectRoot, "node_modules", "@rsbuild", "core", "package.json");
      return existsSync(p) ? p : null;
    },
    () => {
      try {
        return require.resolve("@rsbuild/core/package.json", { paths: [projectRoot] });
      } catch {
        return null;
      }
    },
    () => {
      try {
        return require.resolve("@rsbuild/core/package.json", {
          paths: [resolve(cliDir, ".."), resolve(cliDir, "..", "..")],
        });
      } catch {
        return null;
      }
    },
  ];
  for (const getPath of candidates) {
    const pkgPath = getPath();
    if (!pkgPath) continue;
    return readPackageVersion(pkgPath);
  }
  return "?";
}
