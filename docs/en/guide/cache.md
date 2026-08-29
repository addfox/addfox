# Cache

Addfox creates a `.addfox/cache` directory in your project to speed up development.

## What is stored in `.addfox/cache`

- **`cache/build/`** — Rspack persistent build cache. Enabled by default, it speeds up rebuilds and dev restarts. Configure it with [`buildCache`](/config/cache).
- **`cache/browser-profile/`** — Chromium user-data (profile) directories. By default every `addfox dev` run starts from a **fresh profile**; the profile is only kept between runs when you enable [`keepBrowserProfile`](/config/cache) (top-level config, per-browser override, or the `--keep-browser-profile` CLI flag).

The exact files can differ by platform and mode, but the goal is the same: **avoid repeated cold initialization**.

## Why it matters

- **Faster rebuilds**: the persistent build cache skips recompiling unchanged modules.
- **Optional profile persistence**: with `keepBrowserProfile` enabled, extension install state, settings, and login sessions survive across `addfox dev` runs.

## When to clear cache

Clear `.addfox/cache` if you see:

- Unexpected browser profile behavior
- Extension load state inconsistencies
- Need for a clean-slate debugging environment

You can safely delete the directory; Addfox recreates it on next run.

## Related Configuration

- [`keepBrowserProfile` / `buildCache`](/config/cache) - Cache configuration
