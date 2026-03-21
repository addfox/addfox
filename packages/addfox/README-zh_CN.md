[English](README.md) | 中文

---

<p align="center">
  <img width="230" src="addfox.png">
</p>

<h1 align="center">
Addfox
</h1>
<p align="center">
基于 Rsbuild 的浏览器插件开发框架，简单，快速
</p>

我们一直认为浏览器插件的开发由于调试更加复杂，因此必须使用 **full bundle** 模式以减少开发环境与正式环境的差异。得益于 **Rsbuild 的极致性能**，addfox 通过 **build watch** 的方式进行热更新，既保证了开发和打包后的一致体验，也不会丢失构建性能。

## 快速开始

### 方式一：脚手架创建项目

```bash
pnpm create addfox-app
# 或
npx create-addfox-app
```

按提示选择框架（Vanilla / Vue / React）和语言（JavaScript / TypeScript），会生成完整目录和配置。

### 方式二：在现有项目中安装

将主包 **addfox** 安装为**开发依赖**（构建工具；一次安装即包含 CLI 与构建能力；内部使用 `@addfox/cli` 与 `@rsbuild/core`）：

```bash
pnpm add -D addfox
# 或
npm install -D addfox
# 或
yarn add -D addfox
```

在项目根目录新建 `addfox.config.ts`（或 `addfox.config.js`），并按照下方配置说明编写配置；目录结构需包含 `background`、`content`、`popup`、`options`、`sidepanel` 等入口（默认放在 `app/`，或通过 `appDir` 指定目录）。

### 包与引用约定

- **核心能力**（`defineConfig`、类型、发现、manifest 等）从 **addfox** 主包导出；配置中请使用 `import { defineConfig } from "addfox"`。
- **Content UI** 在 **`@addfox/utils`**：`import { defineContentUI, mountContentUI } from "@addfox/utils"`。需要 `browser` API 时请自行安装 [webextension-polyfill](https://github.com/mozilla/webextension-polyfill)，使用 `import browser from "webextension-polyfill"`。

## 配置说明

配置文件：`addfox.config.ts` 或 `addfox.config.js`。

通过框架提供的 `defineConfig` 返回配置对象，支持以下字段：

| 字段 | 说明 |
|------|------|
| **manifest** | 插件 manifest。可直接写完整 manifest 对象，也可拆成 `chromium` / `firefox` 分别写 |
| **plugins** | Rsbuild 插件数组，同 Vite 一样调用函数引入，如 `plugins: [vue()]`（`@addfox/rsbuild-plugin-vue`）或 `plugins: [pluginReact()]`（`@rsbuild/plugin-react`） |
| **rsbuild** | 覆盖/扩展 Rsbuild 配置（类似 Vite 的 build.rollupOptions / esbuild）。传**对象**时与生成的 base 深度合并；传**函数**时 `(base, helpers) => config` 完全控制。需要细粒度配置时直接写这里 |
| **entry** | 自定义入口：对象形式，key 为入口名（保留名 popup/options/sidepanel/background/devtools/content 不可改，其余可自定义），value 为相对 baseDir 的路径字符串（如 `'content/index.ts'`）。未配置 appDir 时 baseDir=app/，配置了 appDir 则 baseDir=appDir。不传则按默认从 baseDir 发现入口 |
| **appDir** | 应用目录，默认不写则为 `app/`；同时作为 **entry** 路径的查找起点 |
| **outDir** | 打包输出目录，默认 `"extension"` |
| **launch** | 开发模式浏览器启动路径。`launch.chrome`、`launch.firefox` 分别传入 Chrome / Firefox 可执行文件路径；框架在 `addfox dev` 时据此自动启动对应浏览器。未设置时按当前操作系统尝试默认安装路径 |
| **hooks** | 生命周期钩子，在「解析 CLI → 加载配置 → 生成 Rsbuild 配置 → 执行构建」各阶段注入扩展逻辑。见下方「生命周期钩子」 |

### 生命周期钩子

在 `defineConfig` 中可配置 `hooks`，在流水线各阶段执行自定义逻辑（入参为 `PipelineContext`，含 root、command、browser、config、entries、rsbuildConfig 等）：

| 钩子 | 触发时机 |
|------|----------|
| **afterCliParsed** | CLI 参数（command、-b）解析完成后 |
| **afterConfigLoaded** | 配置加载并解析入口（含 entry 配置）完成后 |
| **beforeRsbuildConfig** | manifest 与合并入口确定后、Rsbuild 配置生成前 |
| **beforeBuild** | Rsbuild 配置就绪、执行构建前 |
| **afterBuild** | 构建完成后（仅 `addfox build`；dev 为 watch 不结束） |

### 错误与退出码

CLI 在配置缺失、入口未发现、无效命令或无效 `-b` 等情况下会抛出 **AddfoxError**（带 `code`、`details`、`hint`），并在 stderr 输出清晰原因与建议后以非零退出码退出。错误码见 addfox 导出的 `ADDFOX_ERROR_CODES`。

### 配置示例

```ts
import { defineConfig } from "addfox";
import vue from "@addfox/rsbuild-plugin-vue";

export default defineConfig({
  appDir: "src",
  outDir: "dist",
  manifest: {
    name: "My Extension",
    version: "1.0.0",
    manifest_version: 3,
    permissions: ["storage", "activeTab"],
  },
  plugins: [vue()],
  // 开发模式自动启动浏览器：传入可执行文件路径
  // browserPath: { chrome: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", firefox: "C:\\Program Files\\Firefox\\firefox.exe" },
  // 需要覆盖 Rsbuild 时使用 rsbuild（对象深度合并，函数完全控制）
  // rsbuild: (config) => config,
  // 自定义入口（可选）；不传则按默认从 appDir 发现 background/content/popup/options/sidepanel/devtools
  // entry: { background: "background/index.ts", content: "content/index.ts", popup: "popup/index.ts", myPage: "pages/my.ts" },
  // 生命周期钩子（可选）
  // hooks: { beforeBuild: (ctx) => console.log("Building for", ctx.browser) },
});
```

## 目录结构约定

- 默认从 **app/** 或 **appDir** 指定目录（baseDir）下发现以下入口；也可通过 **entry** 配置自定义路径：
  - **background**、**content**：仅脚本
  - **popup**、**options**、**sidepanel**、**devtools**：需同目录下 `index.html` + 入口脚本
  - 保留入口名（不可改名）：popup、options、sidepanel、background、devtools、content；其余入口名可自定义
  - **entry** 的 value 为相对 baseDir 的路径，如 `'content/index.ts'`、`'src/popup/index.ts'`（baseDir 未设置 appDir 时为 app/）

## 命令

在安装 addfox 的项目中：

- `addfox dev` 或 `pnpm dev`（若在 package.json 中配置为 `"dev": "addfox dev"`）：开发模式，watch + 热更新（需配合 Reload Manager 扩展与本地 WebSocket）
- `addfox build`：生产构建，输出到 `outDir`（默认 `"extension"`）

**终端输出**：执行 `addfox dev` 或 `addfox build` 时，终端中每一行输出前会带青色的 **`[addfox]`** 前缀，便于区分是 addfox 在执行；Rsbuild 的完整日志、进度与错误信息均原样保留。

可通过 **`-b chrome/edge/brave/vivaldi/opera/santa/firefox`** 或 **`--browser=chrome/edge/brave/vivaldi/opera/santa/firefox`** 指定目标浏览器（同时决定使用的 manifest 配置与开发时启动的浏览器）：

- `addfox dev -b chrome` / `addfox dev -b edge` / `addfox dev -b brave` / `addfox dev -b vivaldi` / `addfox dev -b opera` / `addfox dev -b santa` / `addfox dev -b firefox`
- `addfox build -b chrome` / `addfox build -b edge` / `addfox build -b brave` / `addfox build -b vivaldi` / `addfox build -b opera` / `addfox build -b santa` / `addfox build -b firefox`

不传 `-b` 时默认使用 Chrome（manifest 取 `chromium` 分支，启动时用 `launch.chrome` 或系统默认路径）；目标浏览器仅由 `-b` 指定。

## 开发模式热更新

开发模式下会启动 WebSocket 服务，并在构建完成后通知浏览器重载扩展。使用方式与 VideoRoll-Pro 中 `scripts/rsbuild-browser-plugin` 一致：通过 Rsbuild 插件封装，在首次构建完成后自动打开浏览器并加载当前扩展；后续代码变更触发重新构建后，通过 WebSocket 通知扩展重载。

浏览器路径：在 **addfox.config** 中设置 **browserPath** 可覆盖；未设置时框架会按当前系统（Windows / macOS / Linux）尝试常见默认安装路径。

## 仓库结构

- `packages/addfox`：**addfox**，用户安装的主包；提供 `addfox` 命令并委托给 `@addfox/cli`（与「只装 parcel、内部用 @parcel/*」同理）
- `packages/cli`：**@addfox/cli**，CLI 入口与 **Pipeline** 类（串联解析 → 配置 → Rsbuild 配置 → 钩子；可注入 ConfigLoader / CliParser）
- `packages/core`：核心按流水线阶段命名，文件名与类名一致（小写）：**ConfigLoader**（configLoader.ts）、**CliParser**（cliParser.ts）、**EntryDiscoverer**（entryDiscoverer.ts）、**EntryResolver**（entryResolver.ts）、**ManifestBuilder**（manifestBuilder.ts）；常量、AddfoxError、mergeRsbuildConfig、defineConfig、类型
- `packages/utils`：工具（webextension-polyfill 等），按需从 `@addfox/utils` 引用
- `packages/plugins/rsbuild-plugin-extension-entry`：**内部**，解析目录与入口、设置 entry/html/output（包名：`@addfox/rsbuild-plugin-extension-entry`）
- `packages/plugins/rsbuild-plugin-extension-manifest`：**内部**，解析并生成 manifest.json（包名：`@addfox/rsbuild-plugin-extension-manifest`）
- `packages/plugins/rsbuild-plugin-extension-hmr`：**内部**，dev 热更新与启动浏览器
- `packages/plugins/rsbuild-plugin-vue`：Vue 3 + Vue JSX + Less + Babel，用法 `plugins: [vue()]`
- `packages/create-addfox-app`：脚手架 CLI，按选择生成 `plugins: [vue()]` 或 `plugins: [pluginReact()]`（React 使用 @rsbuild/plugin-react）

框架内部默认运行 rsbuild-plugin-extension-entry、rsbuild-plugin-extension-manifest、rsbuild-plugin-extension-hmr；用户通过 `plugins: [vue()]` 等引入框架插件，通过 `rsbuildConfig` 覆盖 Rsbuild。
