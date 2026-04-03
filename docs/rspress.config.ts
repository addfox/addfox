import { transformerNotationHighlight } from "@shikijs/transformers";
import fileTree from "rspress-plugin-file-tree";
import { pluginNodePolyfill } from "@rsbuild/plugin-node-polyfill";

/** 自定义主题、构建产物与工程配置不应参与文档路由与 SSG */
const docRouteExclude = [
  "theme/**",
  "doc_build/**",
  "rspress.config.ts",
  "postcss.config.js",
  "tailwind.config.js",
];

export default {
  root: ".",
  llms: true,
  title: "AddFox - Browser Extension Development Framework",
  description: "AddFox is a browser extension development framework built on Rsbuild, it provides a comprehensive set of tools and features for developing browser extensions.",
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
    [
      "meta",
      {
        name: "keywords",
        content:
          "browser extension, chrome extension, firefox, rsbuild, addfox",
      },
    ],
  ],
};
