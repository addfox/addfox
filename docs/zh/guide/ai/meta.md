---
name: addfox-meta
description: meta.md 提供了项目的结构化元数据，包括权限配置、入口映射、构建产物等，是 AI 进行代码重构和功能设计的关键依据。
---

# meta.md

`meta.md` 是 Addfox 为 AI 助手提供的详细结构化上下文，位于项目根目录下的 `.addfox/` 目录中。

## 1. 核心结构

生成的 `meta.md` 包含以下标准区块：

### 基本信息

包括框架名称、项目名称、描述、版本以及当前的 Manifest 版本号。

### 权限配置

详细列出扩展申请的权限，分为以下三类：
- **Permissions**: 基础功能权限。
- **Host Permissions**: 宿主权限。
- **Optional Permissions**: 可选权限。

### 入口映射

这是最重要的部分，列出了所有扩展入口的详细信息：
- **Source**: 源代码文件的绝对路径。
- **HTML**: 关联 HTML 模板的路径（如果存在）。
- **JS Output**: 构建生成的脚本路径。
- **Flags**: 该入口的配置标志（如 `html: true`, `scriptInject: body` 等）。

---

> **注意**：在进行复杂的架构调整或修改 `addfox.config.ts` 前，务必引导 AI 阅读此文件以确保其生成的方案与当前项目架构兼容。
