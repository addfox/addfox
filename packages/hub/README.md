# @addfox/hub

Browser extension development manager and launcher. Manage multiple extension projects across different tools (addfox, WXT, Plasmo) from a unified dashboard.

## Features

- 🔍 **Project Discovery**: Auto-scan directories and pnpm workspaces for extension projects
- 🛠️ **Multi-Tool Support**: Works with addfox, WXT, Plasmo, and vanilla extensions
- 🌐 **Browser Management**: Launch Chrome/Edge/Brave with extensions pre-loaded
- 🖥️ **Dashboard UI**: Web-based UI for visual project management
- ⌨️ **CLI First**: All functionality available via CLI commands
- 📊 **Debug Tools**: Real-time logs and error monitoring

## Installation

```bash
# Global installation
npm install -g @addfox/hub

# Or use with npx (no install)
npx @addfox/hub

# Or install in your pnpm workspace
pnpm add -D @addfox/hub
```

## Quick Start

```bash
# Start Hub (opens dashboard in browser)
hub

# Or start server only
hub start --cli

# Scan for projects
hub scan

# List projects
hub list

# Start developing
hub dev <project-id>

# View status
hub status
```

## Commands

### `hub start` (default)

Start the Hub server and optionally open the dashboard.

```bash
hub                   # Start server + open browser
hub start             # Same as above
hub start --cli       # Server only, no browser
hub start --port 8080 # Custom port
```

### `hub scan`

Discover extension projects in your directories.

```bash
hub scan                      # Full scan of configured paths
hub scan ~/Projects           # Scan specific path
hub scan --add ~/Projects     # Add path to auto-scan
hub scan -w ~/my-workspace    # Add pnpm workspace
hub scan --list               # Show scan configuration
```

### `hub list`

List projects or sessions.

```bash
hub list              # List all projects
hub list --sessions   # List active sessions
hub list --tool wxt   # Filter by tool
hub list --json       # JSON output
```

### `hub dev`

Start a development session.

```bash
hub dev proj_abc123           # Start by project ID
hub dev ~/Projects/my-ext     # Start by path
hub dev proj_abc123 -b edge   # Use Edge browser
hub dev proj_abc123 --no-launch  # Build only, no browser
```

### `hub stop`

Stop development sessions.

```bash
hub stop sess_xyz789      # Stop specific session
hub stop --project abc    # Stop all for project
hub stop --all            # Stop everything
```

### `hub status`

Show Hub status and active sessions.

```bash
hub status
hub status --watch   # Watch mode
```

### `hub config`

Manage Hub configuration.

```bash
hub config                    # Show all config
hub config get serverPort     # Get specific value
hub config set serverPort 8080
hub config path               # Show config directory
```

## Configuration

Hub stores configuration in `~/.addfox-hub/`:

```
~/.addfox-hub/
├── db.json          # Projects and sessions database
├── logs/            # Log files
└── temp/            # Temporary files
```

Configuration options:

| Key | Default | Description |
|-----|---------|-------------|
| `scan.paths` | `["~/Projects"]` | Directories to auto-scan |
| `workspace.paths` | `[]` | pnpm workspace paths |
| `manualProjects` | `[]` | Manually added project paths |
| `defaultBrowser` | `"chrome"` | Default browser for dev |
| `serverPort` | `3040` | Dashboard server port |
| `autoOpenBrowser` | `true` | Auto-open browser on start |

## pnpm Workspace Support

Hub automatically detects `pnpm-workspace.yaml` files and scans all packages:

```bash
# Add a workspace
hub scan --add-workspace ~/my-workspace

# Or auto-detect during scan
hub scan ~/my-workspace  # Detects pnpm-workspace.yaml automatically
```

## Manual Project Management

You can manually add projects that are outside scan paths:

```bash
# Via CLI
hub dev ~/path/to/extension  # Auto-adds if not in DB

# Via API
POST /api/projects
{ "path": "/path/to/extension", "name": "My Extension" }
```

## API

When the server is running, a REST API is available at `http://localhost:3040/api/`:

- `GET /api/projects` - List projects
- `POST /api/projects` - Add project
- `GET /api/sessions` - List sessions
- `POST /api/sessions` - Create session
- `DELETE /api/sessions/:id` - Stop session
- `GET /api/stats` - Hub statistics
- `WS /api/ws` - WebSocket for real-time updates

## Supported Tools

| Tool | Detection | Dev Server | Build |
|------|-----------|------------|-------|
| addfox | `addfox.config.*` | ✅ | ✅ |
| WXT | `wxt.config.*` | ✅ | ✅ |
| Plasmo | `plasmo.config.*` or `plasmo` dep | ✅ | ✅ |
| Vanilla | `manifest.json` only | ✅ (no build) | ✅ |

## Requirements

- Node.js 18+
- Chrome, Edge, or Brave browser (for dev mode)

## License

MIT
