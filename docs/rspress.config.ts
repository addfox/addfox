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
