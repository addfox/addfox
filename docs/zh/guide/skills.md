---
name: addfox-skills
description: Addfox 可安装 Skill 库文档。本页与 c:/programs/skills 当前内容对齐，包含安装命令、技能列表与目录结构。
---

# Skills

本页内容与 `c:/programs/skills` 的当前仓库保持一致。

该仓库提供可安装的 Addfox 扩展开发 Skills。

## 添加使用

在项目根目录执行：

```bash
# 安装本仓库全部 skills
npx skills add addmo-dev/skills

# 只安装指定 skills
npx skills add addmo-dev/skills --skill migrate-to-addfox
npx skills add addmo-dev/skills --skill addfox-best-practices
npx skills add addmo-dev/skills --skill extension-functions-best-practices
npx skills add addmo-dev/skills --skill addfox-debugging
npx skills add addmo-dev/skills --skill addfox-testing

# 先列出可用 skills
npx skills add addmo-dev/skills --list
```

也可使用完整 GitHub URL：

```bash
npx skills add https://github.com/addmo-dev/skills
```

## Skills 列表

| Skill | 用途 |
|-------|------|
| **migrate-to-addfox** | 将现有项目从 WXT、Plasmo、Extension.js 或无框架方案迁移到 Addfox。 |
| **addfox-best-practices** | Addfox 项目最佳实践：入口、配置、manifest、权限、跨浏览器、框架样式、消息通信等。 |
| **extension-functions-best-practices** | 扩展功能实现指南：视频/音频/图片/下载/AI/翻译/密码管理/Web3 等能力场景。 |
| **addfox-debugging** | Addfox 构建与运行问题排查：结合终端、`.addfox/error.md`、`.addfox/meta.md` 进行定位。 |
| **addfox-testing** | Addfox 测试实践：单元测试与 E2E 测试的选型、配置和落地方式。 |

## 仓库结构

```tree
skills/
├── migrate-to-addfox/
│   ├── SKILL.md
│   └── references/
├── addfox-best-practices/
│   ├── SKILL.md
│   ├── reference.md
│   └── rules/
├── extension-functions-best-practices/
│   ├── SKILL.md
│   └── reference.md
├── addfox-debugging/
│   ├── SKILL.md
│   └── reference.md
└── addfox-testing/
    ├── SKILL.md
    └── reference.md
```

## 说明

- Skills 通过 `skills CLI` 安装后，会复制到项目技能目录（如 `.cursor/skills/` 或 `.agents/skills/`）。
- 可以先全量安装，再按团队需求保留常用技能。
