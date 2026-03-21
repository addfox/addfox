export type Framework =
  | "vanilla"
  | "vue"
  | "react"
  | "preact"
  | "svelte"
  | "solid";

export type Language = "js" | "ts";

/** Style / CSS tooling (after framework). `none` = no extra style stack. */
export type StyleEngine = "none" | "tailwindcss" | "unocss" | "less" | "sass";

export const STYLE_ENGINES: { title: string; value: StyleEngine }[] = [
  { title: "无", value: "none" },
  { title: "Tailwind CSS", value: "tailwindcss" },
  { title: "UnoCSS", value: "unocss" },
  { title: "Less", value: "less" },
  { title: "Sass (SCSS)", value: "sass" },
];

export const FRAMEWORKS: { title: string; value: Framework }[] = [
  { title: "Vanilla", value: "vanilla" },
  { title: "Vue", value: "vue" },
  { title: "React", value: "react" },
  { title: "Preact", value: "preact" },
  { title: "Svelte", value: "svelte" },
  { title: "Solid", value: "solid" },
];

export const LANGUAGES: { title: string; value: Language }[] = [
  { title: "TypeScript", value: "ts" },
  { title: "JavaScript", value: "js" },
];

export function getTemplateName(framework: Framework, language: Language): string {
  return `template-${framework}-${language}`;
}
