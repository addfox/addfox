# AI usage (@addfox/rsbuild-plugin-vue)

## Purpose

Enables **Vue 3** (SFC, Vue JSX, Babel) for addfox projects. Users add `plugins: [vue()]` in addfox.config.

## When to use

- When the user project uses **Vue 3** for popup/options etc., in addfox.config: `import vue from "@addfox/rsbuild-plugin-vue"; export default defineConfig({ ..., plugins: [vue()] })`
- This package injects @rsbuild/plugin-vue and Babel etc., and works with CLI pipeline’s `getVueRsbuildPlugins`

## When changing this package

- Keep compatibility with @rsbuild/plugin-vue; Vue build logic is owned by the Rsbuild plugin
