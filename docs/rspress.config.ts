import { transformerNotationHighlight } from "@shikijs/transformers";
import fileTree from "rspress-plugin-file-tree";
import { pluginNodePolyfill } from "@rsbuild/plugin-node-polyfill";

/** Custom theme files, build outputs, and tooling config should not be included in doc routes or SSG. */
const docRouteExclude = [
  "theme/**",
  "doc_build/**",
  "rspress.config.ts",
  "postcss.config.js",
  "tailwind.config.js",
];

const SITE_URL = (process.env.DOCS_SITE_URL ?? "https://addfox.dev").replace(/\/+$/, "");
const SITE_TITLE = "AddFox - Browser Extension Development Framework";
const SITE_DESCRIPTION =
  "AddFox is a browser extension development framework built on Rsbuild, it provides a comprehensive set of tools and features for developing browser extensions.";
const OG_IMAGE_PATH = "/og-image.png";
const OG_IMAGE_URL = `${SITE_URL}${OG_IMAGE_PATH}`;
const HOME_URL = `${SITE_URL}/`;
const GUIDE_URL = `${SITE_URL}/guide/`;
const CONFIG_URL = `${SITE_URL}/config/`;
const EXAMPLES_URL = `${SITE_URL}/examples/`;
const CLI_URL = `${SITE_URL}/guide/cli`;

const jsonLdWebSite = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "AddFox",
  url: HOME_URL,
  description: SITE_DESCRIPTION,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
});

const jsonLdSiteNavigation = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SiteNavigationElement",
  name: ["Guide", "Config", "Examples", "CLI"],
  url: [GUIDE_URL, CONFIG_URL, EXAMPLES_URL, CLI_URL],
});

const jsonLdBreadcrumb = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: HOME_URL,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Guide",
      item: GUIDE_URL,
    },
  ],
});

export default {
  root: ".",
  llms: true,
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  route: { exclude: docRouteExclude },
  plugins: [fileTree()],
  builderConfig: {
    plugins: [pluginNodePolyfill()],
  },
  logoText: "AddFox",
  lang: "en",
  locales: [
    {
      lang: "zh",
      label: "简体中文",
      title: "AddFox",
      description: "基于 Rsbuild 的浏览器扩展开发框架",
    },
    {
      lang: "en",
      label: "English",
      title: "AddFox",
      description: "Browser extension development framework built on Rsbuild",
    },
    {
      lang: "ja",
      label: "日本語",
      title: "AddFox",
      description: "Rsbuild ベースのブラウザ拡張開発フレームワーク",
    },
    {
      lang: "ko",
      label: "한국어",
      title: "AddFox",
      description: "Rsbuild 기반 브라우저 확장 프로그램 개발 프레임워크",
    },
    {
      lang: "ru",
      label: "Русский",
      title: "AddFox",
      description: "Фреймворк разработки браузерных расширений на базе Rsbuild",
    },
    {
      lang: "es",
      label: "Español",
      title: "AddFox",
      description: "Framework de desarrollo de extensiones de navegador basado en Rsbuild",
    },
  ],
  icon: "/addfox-z.png",
  logo: { light: "/addfox-z.png", dark: "/addfox-light-z.png" },
  themeConfig: {
    socialLinks: [
      {
        icon: "github",
        mode: "link",
        content: "https://github.com/addfox/addfox",
      },
    ],
    editLink: {
      docRepoBaseUrl: "https://github.com/addfox/addfox/tree/main/docs",
    },
  },
  i18nSource: {
    editLinkText: {
      zh: "编辑此页",
      en: "Edit this page",
      ja: "このページを編集",
      ko: "이 페이지 편집",
      ru: "Редактировать эту страницу",
      es: "Editar esta página",
    },
  },
  markdown: {
    showLineNumbers: true,
    shiki: {
      transformers: [transformerNotationHighlight()],
    },
  },
  head: [
    ["link", { rel: "canonical", href: HOME_URL }],
    [
      "meta",
      {
        name: "keywords",
        content:
          "browser extension, chrome extension, firefox, rsbuild, addfox",
      },
    ],
    ["meta", { name: "robots", content: "index,follow,max-image-preview:large" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "AddFox" }],
    ["meta", { property: "og:title", content: SITE_TITLE }],
    ["meta", { property: "og:description", content: SITE_DESCRIPTION }],
    ["meta", { property: "og:url", content: HOME_URL }],
    ["meta", { property: "og:image", content: OG_IMAGE_URL }],
    ["meta", { property: "og:image:secure_url", content: OG_IMAGE_URL }],
    ["meta", { property: "og:image:type", content: "image/png" }],
    ["meta", { property: "og:image:alt", content: "AddFox documentation cover image" }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
    ["meta", { name: "twitter:title", content: SITE_TITLE }],
    ["meta", { name: "twitter:description", content: SITE_DESCRIPTION }],
    ["meta", { name: "twitter:image", content: OG_IMAGE_URL }],
    ["script", { type: "application/ld+json" }, jsonLdWebSite],
    ["script", { type: "application/ld+json" }, jsonLdSiteNavigation],
    ["script", { type: "application/ld+json" }, jsonLdBreadcrumb],
  ],
};
