# Cache

Addfox creates a `.addfox/cache` directory in your project to improve development workflow performance.

## What is stored in `.addfox/cache`

Typical cached data includes:

- Browser profile/user-data cache (to reuse extension-loaded browser state)
- Build-time intermediate cache (to reduce repeated compile work)

The exact files can differ by platform and mode, but the goal is the same: **avoid repeated cold initialization**.

## Why it matters

The most visible benefit is faster `dev` startup:

- First `addfox dev`: full browser/profile initialization and extension loading
- Next `addfox dev` runs: cached state helps the browser return to a ready-to-debug state faster

In practice, after the first successful dev start, later starts are usually smoother with fewer manual steps.

## When to clear cache

Clear `.addfox/cache` if you see:

- Unexpected browser profile behavior
- Extension load state inconsistencies
- Need for a clean-slate debugging environment

You can safely delete the directory; Addfox recreates it on next run.
