# 缓存

Addfox 会在项目下生成 `.addfox/cache` 目录，用于提升开发效率。

## `.addfox/cache` 里有什么

- **`cache/build/`** — Rspack 持久化构建缓存。默认开启，可加快重新构建和 dev 重启速度。通过 [`buildCache`](/config/cache) 配置。
- **`cache/browser-profile/`** — Chromium 用户数据（profile）目录。默认情况下，每次 `addfox dev` 都从**全新 profile** 启动；只有启用 [`keepBrowserProfile`](/config/cache)（顶层配置、按浏览器覆盖，或 `--keep-browser-profile` CLI 标志）后，profile 才会在多次运行之间保留。

不同平台和运行模式下，具体缓存文件可能略有差异，但目标一致：**避免重复的冷初始化**。

## 有什么作用

- **更快的重新构建**：持久化构建缓存会跳过未变化模块的重新编译。
- **可选的 profile 持久化**：启用 `keepBrowserProfile` 后，扩展安装状态、设置和登录会话可以在多次 `addfox dev` 运行之间保留。

## 什么时候清理缓存

出现以下情况时可以清理 `.addfox/cache`：

- 浏览器 profile 行为异常
- 扩展加载状态不一致
- 需要全新环境排查问题

可以直接删除该目录，Addfox 会在下次运行时自动重建。

## 相关配置

- [`keepBrowserProfile` / `buildCache`](/config/cache) - 缓存配置
