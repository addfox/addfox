import { existsSync } from "node:fs";
import { cp, mkdir } from "node:fs/promises";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATE_BASE = "templates";

/** create-addfox-app package root (parent of dist/). */
function getPackageRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..");
}

function getBundledTemplatesDir(): string {
  return join(getPackageRoot(), TEMPLATE_BASE);
}

/** True if the bundled `templates/<name>` directory exists in this package. */
export function hasLocalTemplate(templateName: string): boolean {
  return existsSync(join(getBundledTemplatesDir(), templateName));
}

const SKIP_RELATIVE_SEGMENTS = new Set(["node_modules", ".git", ".pnpm"]);

/**
 * Skip dependency trees and VCS **inside the template folder** when copying.
 * Must use paths relative to `templateRoot`: the install path often contains
 * `.pnpm` / `node_modules` (e.g. pnpm store), which must not cause every file to be skipped.
 */
export function shouldCopyLocalTemplatePath(src: string, templateRoot: string): boolean {
  const root = resolve(templateRoot);
  const rel = relative(root, resolve(src));
  if (rel.startsWith("..")) {
    return true;
  }
  for (const part of rel.split(/[/\\]/)) {
    if (SKIP_RELATIVE_SEGMENTS.has(part)) {
      return false;
    }
  }
  return true;
}

/**
 * Copy bundled template from node_modules/create-addfox-app/templates into destDir.
 * @throws If the template folder is missing (broken install or forgot to run build).
 */
export async function copyBundledTemplate(templateName: string, destDir: string): Promise<void> {
  const templatePath = join(getBundledTemplatesDir(), templateName);
  if (!existsSync(templatePath)) {
    throw new Error(
      `Bundled template "${templateName}" not found under create-addfox-app. Reinstall the package.`,
    );
  }
  await mkdir(destDir, { recursive: true });
  const resolvedTemplate = resolve(templatePath);
  await cp(resolvedTemplate, destDir, {
    recursive: true,
    filter: (src) => shouldCopyLocalTemplatePath(src, resolvedTemplate),
  });
}
