# CLI

本页汇总 `addfox` CLI 支持的命令与参数。

## 基本用法

```bash
addfox <command> [options]
```

## 命令

| 命令 | 说明 |
|------|------|
| `dev` | 启动开发模式（支持热更新）。 |
| `build` | 执行生产构建。 |
| `test` | 运行测试（参数会透传给 rstest）。 |

## 常用参数（默认值 + 配置映射）

| 参数 | 内置默认值 | 对应 `addfox.config` 字段 | 说明 |
|------|------------|---------------------------|------|
| `-b, --browser <browser>` | `chromium` | 无直接字段（影响目标与启动） | 指定目标/启动浏览器，例如 `chromium`、`firefox`、`chrome`、`edge`、`brave`。 |
| `-c, --cache` | `true` | `cache` | 启用浏览器 profile 缓存。 |
| `--no-cache` | `false`（仅当前命令） | `cache` | 禁用本次运行的浏览器 profile 缓存。 |
| `-r, --report` | `false` | `report` | 启用 Rsdoctor 构建分析报告。 |
| `--no-open` | `false`（即默认自动打开） | 无直接字段 | 构建或开发时不自动打开浏览器。 |
| `--debug` | `false` | `debug` | 启用调试模式（开发时错误监控等能力）。 |
| `--help` | - | - | 显示帮助。 |
| `--version` | - | - | 显示版本号。 |

## 示例

```bash
# Chromium 开发模式
addfox dev -b chromium

# Firefox 开发 + 调试
addfox dev -b firefox --debug

# 生产构建
addfox build -b chrome

# 构建但不自动打开浏览器
addfox build -b chrome --no-open

# 生成构建分析报告
addfox build -r
```

## 说明

- `--debug` 主要作用于 `dev` 模式。
- `--no-cache` 适合做“干净环境”排查；`cache` 仍可在配置文件中作为项目默认值。
- `-b/--browser` 没有单独的 config 字段，属于命令级选择。
