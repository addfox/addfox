<p align="center">
  <img width="200" src="https://raw.githubusercontent.com/addfox/addfox/main/addfox.png" alt="Addfox">
</p>

# @addfox/core

[English](README.md) | 中文

---

addfox 核心：类型、配置加载、入口发现/解析、manifest 构建、错误与常量。被 CLI 与插件使用，也可在自定义脚本中直接使用。

- **defineConfig**：配置辅助函数，返回用户配置
- **ConfigLoader / resolveAddfoxConfig**：加载 addfox.config 并解析为完整配置与入口列表
- **EntryDiscoverer / EntryResolver**：从目录发现入口或根据 `entry` 配置解析
- **ManifestBuilder**：根据配置与入口构建各浏览器 manifest
- **CliParser**：解析 `addfox dev|build [-b chrome|edge|brave|vivaldi|opera|santa|firefox]`
- **mergeRsbuildConfig**：深度合并 Rsbuild 配置
- **AddfoxError / create*Error**：统一错误类型与工厂函数
