import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = join(__dirname, "..");
const LOCALES = ["en", "zh", "ja", "ko", "ru", "es"];
const SECTIONS = ["guide", "config", "examples", "blog", "resources"];

function readMeta(dir) {
  const path = join(dir, "_meta.json");
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function readFirstHeading(dir, name) {
  for (const ext of [".mdx", ".md"]) {
    const path = join(dir, name + ext);
    try {
      const content = readFileSync(path, "utf8");
      // Remove frontmatter
      const body = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "");
      const match = body.match(/^#\s+(.+)$/m);
      if (match) return match[1].trim();
    } catch {}
  }
  return null;
}

function readFrontmatterTitle(dir, name) {
  for (const ext of [".mdx", ".md"]) {
    const path = join(dir, name + ext);
    try {
      const content = readFileSync(path, "utf8");
      const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
      if (match) {
        const titleMatch = match[1].match(/^title:\s*(.+)$/m);
        if (titleMatch) return titleMatch[1].trim().replace(/^["']|["']$/g, "");
      }
    } catch {}
  }
  return null;
}

function getLabel(dir, name, entryLabel) {
  if (entryLabel) return entryLabel;
  const fmTitle = readFrontmatterTitle(dir, name);
  if (fmTitle) return fmTitle;
  const h1 = readFirstHeading(dir, name);
  if (h1) return h1;
  return capitalize(name);
}

function metaToSidebarItems(dir, baseLink) {
  const meta = readMeta(dir);
  if (!meta) return [];
  const items = [];
  for (const entry of meta) {
    if (typeof entry === "string") {
      items.push({ text: getLabel(dir, entry), link: `${baseLink}/${entry}` });
    } else if (entry.type === "file") {
      items.push({ text: getLabel(dir, entry.name, entry.label), link: `${baseLink}/${entry.name}` });
    } else if (entry.type === "dir") {
      const subDir = join(dir, entry.name);
      const subItems = metaToSidebarItems(subDir, `${baseLink}/${entry.name}`);
      items.push({
        text: entry.label || capitalize(entry.name),
        items: subItems,
        collapsible: entry.collapsible !== false,
        collapsed: entry.collapsed !== false,
      });
    } else if (entry.type === "section-header") {
      items.push({ sectionHeaderText: entry.label });
    }
  }
  return items;
}

function capitalize(s) {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const sidebar = {};
for (const locale of LOCALES) {
  for (const section of SECTIONS) {
    const dir = join(DOCS_ROOT, locale, section);
    const prefix = locale === "en" ? `/${section}/` : `/${locale}/${section}/`;
    const items = metaToSidebarItems(dir, prefix.slice(0, -1));
    if (items.length) {
      sidebar[prefix] = items;
    }
  }
}

writeFileSync(join(DOCS_ROOT, "sidebar.json"), JSON.stringify(sidebar, null, 2), "utf8");
console.log("sidebar.json generated with", Object.keys(sidebar).length, "entries");
