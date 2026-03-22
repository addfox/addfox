/**
 * Full `addfox.config` codegen when the template has no usable file (fallback only).
 * Normal scaffold: the template’s addfox.config is kept and merged (see `./merge.ts`).
 */

import type { Framework, Language, StyleEngine } from "../template/catalog.ts";

function getFrameworkPluginImport(framework: Framework): string {
  switch (framework) {
    case "react":
      return `import { pluginReact } from "@rsbuild/plugin-react";`;
    case "preact":
      return `import { pluginPreact } from "@rsbuild/plugin-preact";`;
    case "vue":
      return `import { pluginVue } from "@rsbuild/plugin-vue";`;
    case "svelte":
      return `import { pluginSvelte } from "@rsbuild/plugin-svelte";`;
    case "solid":
      return `import { pluginSolid } from "@rsbuild/plugin-solid";`;
    default:
      return "";
  }
}

function getFrameworkPluginCall(framework: Framework): string | null {
  switch (framework) {
    case "react":
      return "pluginReact()";
    case "preact":
      return "pluginPreact()";
    case "vue":
      return "pluginVue()";
    case "svelte":
      return "pluginSvelte()";
    case "solid":
      return "pluginSolid()";
    default:
      return null;
  }
}

export function getStylePlugin(engine: StyleEngine | undefined): { importLine: string; call: string } | null {
  if (engine === "none" || engine === undefined) {
    return null;
  }
  if (engine === "less") {
    return { importLine: `import { pluginLess } from "@rsbuild/plugin-less";`, call: "pluginLess()" };
  }
  if (engine === "sass") {
    return { importLine: `import { pluginSass } from "@rsbuild/plugin-sass";`, call: "pluginSass()" };
  }
  return null;
}

/**
 * Manifest without entry paths; addfox discovers from app/ and fills at build.
 * Icons match scaffold `public/icons/icon_128.png` (toolbar / store use the same asset).
 */
const MINIMAL_MANIFEST = [
  "  name: \"My Extension\",",
  "  version: \"1.0.0\",",
  "  manifest_version: 3,",
  "  description: \"Browser extension built with addfox\",",
  "  permissions: [\"activeTab\"],",
  "  icons: {",
  '    "16": "icons/icon_128.png",',
  '    "48": "icons/icon_128.png",',
  '    "128": "icons/icon_128.png",',
  "  },",
  "  action: {",
  "    default_icon: {",
  '      "16": "icons/icon_128.png",',
  '      "48": "icons/icon_128.png",',
  '      "128": "icons/icon_128.png",',
  "    },",
  "  },",
].join("\n");

export function generateAddfoxConfig(
  framework: Framework,
  _language: Language,
  styleEngine?: StyleEngine
): string {
  const importLines: string[] = [];
  const fwImport = getFrameworkPluginImport(framework);
  if (fwImport) importLines.push(fwImport);
  const st = getStylePlugin(styleEngine);
  if (st) importLines.push(st.importLine);

  const pluginCalls: string[] = [];
  const fwCall = getFrameworkPluginCall(framework);
  if (fwCall) pluginCalls.push(fwCall);
  if (st) pluginCalls.push(st.call);

  const pluginsLine =
    pluginCalls.length > 0 ? `  plugins: [${pluginCalls.join(", ")}],` : "";

  const parts: string[] = [
    "import { defineConfig } from \"addfox\";",
    importLines.length ? `\n${importLines.join("\n")}\n` : "",
    "const manifest = {",
    MINIMAL_MANIFEST,
    "};",
    "",
    "export default defineConfig({",
    "  manifest: { chromium: manifest, firefox: { ...manifest } },",
    ...(pluginsLine ? [pluginsLine] : []),
    "});",
  ];
  return parts.filter(Boolean).join("\n");
}
