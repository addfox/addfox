# Addfox Hub 技术方案 V2

> **更新重点**: CLI 优先架构、独立运行模式、轻量数据存储

## 1. 设计哲学

### 1.1 CLI 优先

Hub 本质上是一个 **CLI 工具**，UI 只是 CLI 的可视化封装。

```
┌─────────────────────────────────────────────────────────────┐
│                      用户交互层                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   UI Mode (localhost:3040)         CLI Mode (Terminal)      │
│   ┌─────────────────────┐          ┌──────────────────┐     │
│   │  Dashboard React UI │          │ $ hub dev my-ext │     │
│   │  ─────────────────  │          │ $ hub list       │     │
│   │  调用 REST API      │          │ $ hub status     │     │
│   └──────────┬──────────┘          └────────┬─────────┘     │
│              │                              │               │
│              └──────────────┬───────────────┘               │
│                             ▼                               │
│                    ┌─────────────────┐                      │
│                    │   Hub Core API  │                      │
│                    │   (TypeScript)  │                      │
│                    └─────────────────┘                      │
│                             │                               │
└─────────────────────────────┼───────────────────────────────┘
                              ▼
                    ┌─────────────────┐
                    │  JSON Database  │
                    │  (LowDB/JSON)   │
                    └─────────────────┘
```

### 1.2 完全独立运行

**核心原则**: Hub 不依赖任何 addfox 项目，可以在任何目录独立运行。

```bash
# 全局安装（推荐）
npm install -g @addfox/hub

# 或者使用 npx（无需安装）
npx @addfox/hub

# 无论哪种方式，Hub 都是完全独立的
# 不需要在 addfox 项目内，甚至不需要任何 addfox 项目存在
```

### 1.3 数据持久化策略

**选择: LowDB (纯 JSON)**

- **零依赖**: 不需要 SQLite/LevelDB 的原生编译
- **可读性**: JSON 文件可以直接查看和编辑
- **轻量级**: 数据量小（项目列表、会话状态），JSON 完全够用
- **事务简单**: Hub 是单用户本地工具，无并发问题

```typescript
// Hub 数据存储 (~/.addfox-hub/db.json)
{
  "version": 1,
  "settings": {
    "scanRoots": ["~/Projects", "~/workspace/extensions"],
    "defaultBrowser": "chrome",
    "serverPort": 3040,
    "cliOutput": "pretty"  // pretty | json | silent
  },
  "projects": [
    {
      "id": "proj_a1b2c3",
      "name": "my-extension",
      "path": "/home/user/Projects/my-extension",
      "tool": "addfox",
      "manifest": { /* ... */ },
      "discoveredAt": "2024-01-15T10:30:00Z",
      "lastDevAt": "2024-01-20T14:22:00Z"
    }
  ],
  "sessions": [
    {
      "id": "sess_x9y8z7",
      "projectId": "proj_a1b2c3",
      "browser": "chrome",
      "status": "running",
      "pid": 12345,
      "debuggingPort": 9222,
      "startedAt": "2024-01-20T14:22:00Z"
    }
  ]
}
```

---

## 2. CLI 命令设计

### 2.1 命令总览

```bash
hub [command] [options]

# 全局选项
--version, -v          显示版本
--help, -h             显示帮助
--config-dir <path>    配置目录（默认: ~/.addfox-hub）
--json                 输出 JSON 格式（适合脚本）
--silent               静默模式
```

### 2.2 核心命令

#### `hub` 或 `hub start` - 启动 Hub

```bash
# 默认: 启动 Server + 打开浏览器访问 UI
hub
hub start

# CLI 模式（只启动后台服务，不打开 UI）
hub start --cli

# 指定端口
hub start --port 8080

# 不自动打开浏览器
hub start --no-open
```

#### `hub scan` - 扫描项目

```bash
# 扫描配置的根目录
hub scan

# 添加新的扫描目录
hub scan --add ~/Projects/extensions
hub scan --add ~/work --tool addfox  # 只扫描 addfox 项目

# 移除扫描目录
hub scan --remove ~/work

# 扫描特定路径（一次性）
hub scan ~/Projects/my-extension

# 显示扫描结果
hub scan --list
```

#### `hub list` 或 `hub ls` - 列出项目

```bash
# 列出所有项目
hub list

# 按工具筛选
hub list --tool addfox
hub list --tool wxt

# 显示详细信息
hub list --detail

# 输出 JSON
hub list --json
```

#### `hub dev` - 启动开发

```bash
# 通过项目 ID 启动
hub dev proj_a1b2c3

# 通过路径启动（自动添加到 Hub）
hub dev ~/Projects/my-extension

# 指定浏览器
hub dev proj_a1b2c3 --browser edge
hub dev proj_a1b2c3 -b brave

# 不自动打开浏览器（只启动构建）
hub dev proj_a1b2c3 --no-launch

# 在后台运行（返回 session ID）
hub dev proj_a1b2c3 --detach
```

#### `hub stop` - 停止开发

```bash
# 停止特定会话
hub stop sess_x9y8z7

# 停止特定项目
hub stop --project proj_a1b2c3

# 停止所有会话
hub stop --all
```

#### `hub status` - 查看状态

```bash
# 查看 Hub 状态
hub status

# 查看所有会话
hub status --sessions

# 查看特定项目状态
hub status proj_a1b2c3

# 实时监视（类似 docker stats）
hub status --watch
```

#### `hub logs` - 查看日志

```bash
# 查看项目日志
hub logs proj_a1b2c3

# 实时跟踪
hub logs proj_a1b2c3 --follow

# 查看最后 N 行
hub logs proj_a1b2c3 --tail 100
```

#### `hub build` - 构建项目

```bash
# 构建项目
hub build proj_a1b2c3

# 生产构建
hub build proj_a1b2c3 --prod

# 为特定浏览器构建
hub build proj_a1b2c3 --browser firefox
```

#### `hub open` - 打开项目 UI

```bash
# 打开 Hub Dashboard
hub open

# 直接打开项目的 dev URL
hub open proj_a1b2c3
```

#### `hub config` - 配置管理

```bash
# 查看配置
hub config

# 设置配置项
hub config set defaultBrowser edge
hub config set scanRoots "~/Projects,~/work"

# 编辑配置文件
hub config edit
```

### 2.3 快捷命令别名

```bash
# 快速启动当前目录项目（如果是扩展项目）
hub .
hub dev .

# 快速启动最近开发的项目
hub !
hub dev !
```

---

## 3. 架构设计

### 3.1 包结构

```
packages/hub/
├── package.json
├── bin/
│   └── hub.js                   # CLI 入口
├── src/
│   ├── cli/                     # CLI 层
│   │   ├── index.ts            # 命令注册
│   │   ├── start.ts            # hub start
│   │   ├── scan.ts             # hub scan
│   │   ├── list.ts             # hub list
│   │   ├── dev.ts              # hub dev
│   │   ├── stop.ts             # hub stop
│   │   ├── status.ts           # hub status
│   │   ├── logs.ts             # hub logs
│   │   ├── build.ts            # hub build
│   │   ├── open.ts             # hub open
│   │   ├── config.ts           # hub config
│   │   └── utils/
│   │       ├── output.ts       # 输出格式化
│   │       ├── spinner.ts      # 加载动画
│   │       └── errors.ts       # 错误处理
│   ├── core/                    # 核心业务逻辑
│   │   ├── index.ts            # 统一导出
│   │   ├── db.ts               # 数据库操作
│   │   ├── config.ts           # 配置管理
│   │   ├── scanner.ts          # 项目扫描
│   │   ├── project.ts          # 项目管理
│   │   ├── session.ts          # 会话管理
│   │   ├── browser.ts          # 浏览器控制
│   │   ├── builder.ts          # 构建编排
│   │   └── adapters/           # 工具适配器
│   │       ├── index.ts
│   │       ├── base.ts
│   │       ├── addfox.ts
│   │       ├── wxt.ts
│   │       ├── plasmo.ts
│   │       └── vanilla.ts
│   ├── server/                  # HTTP Server (可选加载)
│   │   ├── index.ts            # 服务入口
│   │   ├── router.ts           # 路由
│   │   ├── api/                # API 端点
│   │   │   ├── projects.ts
│   │   │   ├── sessions.ts
│   │   │   ├── logs.ts
│   │   │   └── system.ts
│   │   └── websocket.ts        # WebSocket 事件
│   ├── ui/                      # UI 静态资源
│   │   └── dist/               # 构建后的 UI 文件
│   └── types.ts                 # 类型定义
└── README.md
```

### 3.2 核心模块

#### 数据库层 (LowDB)

```typescript
// src/core/db.ts
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join } from 'path';
import { homedir } from 'os';

export interface Project {
  id: string;
  name: string;
  path: string;
  tool: 'addfox' | 'wxt' | 'plasmo' | 'vanilla';
  manifest?: any;
  discoveredAt: string;
  lastModified: string;
  lastDevAt?: string;
  buildCount?: number;
}

export interface Session {
  id: string;
  projectId: string;
  browser: string;
  status: 'starting' | 'running' | 'stopping' | 'error';
  pid?: number;
  debuggingPort?: number;
  userDataDir?: string;
  buildProcess?: number;
  startedAt: string;
  logs: LogEntry[];
}

export interface HubSettings {
  scanRoots: string[];
  defaultBrowser: string;
  serverPort: number;
  cliOutput: 'pretty' | 'json' | 'silent';
  maxLogHistory: number;
}

export interface HubDatabase {
  version: number;
  settings: HubSettings;
  projects: Project[];
  sessions: Session[];
}

const defaultData: HubDatabase = {
  version: 1,
  settings: {
    scanRoots: [join(homedir(), 'Projects')],
    defaultBrowser: 'chrome',
    serverPort: 3040,
    cliOutput: 'pretty',
    maxLogHistory: 1000,
  },
  projects: [],
  sessions: [],
};

export class HubDB {
  private db: Low<HubDatabase>;

  constructor(configDir: string) {
    const file = join(configDir, 'db.json');
    const adapter = new JSONFile<HubDatabase>(file);
    this.db = new Low(adapter, defaultData);
  }

  async init(): Promise<void> {
    await this.db.read();
    // 数据迁移逻辑
    if (this.db.data.version < 1) {
      this.db.data = { ...defaultData };
    }
    await this.db.write();
  }

  // 项目操作
  get projects(): Project[] { return this.db.data.projects; }
  async addProject(project: Project): Promise<void> {
    this.db.data.projects.push(project);
    await this.db.write();
  }
  async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    const idx = this.db.data.projects.findIndex(p => p.id === id);
    if (idx >= 0) {
      this.db.data.projects[idx] = { ...this.db.data.projects[idx], ...updates };
      await this.db.write();
    }
  }
  async removeProject(id: string): Promise<void> {
    this.db.data.projects = this.db.data.projects.filter(p => p.id !== id);
    await this.db.write();
  }

  // 会话操作
  get sessions(): Session[] { return this.db.data.sessions; }
  async addSession(session: Session): Promise<void> {
    this.db.data.sessions.push(session);
    await this.db.write();
  }
  async updateSession(id: string, updates: Partial<Session>): Promise<void> {
    const idx = this.db.data.sessions.findIndex(s => s.id === id);
    if (idx >= 0) {
      this.db.data.sessions[idx] = { ...this.db.data.sessions[idx], ...updates };
      await this.db.write();
    }
  }
  async removeSession(id: string): Promise<void> {
    this.db.data.sessions = this.db.data.sessions.filter(s => s.id !== id);
    await this.db.write();
  }

  // 设置
  get settings(): HubSettings { return this.db.data.settings; }
  async updateSettings(updates: Partial<HubSettings>): Promise<void> {
    this.db.data.settings = { ...this.db.data.settings, ...updates };
    await this.db.write();
  }
}
```

#### 项目管理

```typescript
// src/core/project.ts
import { HubDB, Project } from './db.js';
import { createHash } from 'crypto';
import { resolve, basename } from 'path';

export class ProjectManager {
  constructor(private db: HubDB) {}

  // 生成项目 ID (基于路径的 hash)
  private generateId(path: string): string {
    return createHash('md5').update(path).digest('hex').slice(0, 12);
  }

  async findByPath(path: string): Promise<Project | undefined> {
    const resolved = resolve(path);
    const id = this.generateId(resolved);
    return this.db.projects.find(p => p.id === id);
  }

  async findById(id: string): Promise<Project | undefined> {
    return this.db.projects.find(p => p.id === id);
  }

  async add(path: string, tool: string, manifest?: any): Promise<Project> {
    const resolved = resolve(path);
    const existing = await this.findByPath(resolved);
    if (existing) return existing;

    const project: Project = {
      id: this.generateId(resolved),
      name: manifest?.name || basename(resolved),
      path: resolved,
      tool: tool as any,
      manifest,
      discoveredAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    await this.db.addProject(project);
    return project;
  }

  async list(options?: { tool?: string }): Promise<Project[]> {
    let projects = this.db.projects;
    if (options?.tool) {
      projects = projects.filter(p => p.tool === options.tool);
    }
    return projects.sort((a, b) => 
      (b.lastDevAt || b.discoveredAt).localeCompare(a.lastDevAt || a.discoveredAt)
    );
  }

  async updateDevTime(id: string): Promise<void> {
    await this.db.updateProject(id, {
      lastDevAt: new Date().toISOString(),
      buildCount: (this.db.projects.find(p => p.id === id)?.buildCount || 0) + 1,
    });
  }
}
```

#### 会话管理

```typescript
// src/core/session.ts
import { HubDB, Session } from './db.js';
import { spawn, ChildProcess } from 'child_process';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

export interface DevSessionOptions {
  projectId: string;
  browser: string;
  headless?: boolean;
  noLaunch?: boolean;
}

export class SessionManager {
  private processes = new Map<string, ChildProcess>();

  constructor(private db: HubDB) {}

  async create(options: DevSessionOptions): Promise<Session> {
    const id = randomBytes(8).toString('hex');
    const userDataDir = join(tmpdir(), `hub-chrome-${id}`);
    await mkdir(userDataDir, { recursive: true });

    const session: Session = {
      id,
      projectId: options.projectId,
      browser: options.browser,
      status: 'starting',
      userDataDir,
      debuggingPort: await this.findFreePort(),
      startedAt: new Date().toISOString(),
      logs: [],
    };

    await this.db.addSession(session);
    return session;
  }

  async launch(sessionId: string, extensionPath: string): Promise<void> {
    const session = this.db.sessions.find(s => s.id === sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const browserPath = await this.resolveBrowserPath(session.browser);
    
    const proc = spawn(browserPath, [
      `--user-data-dir=${session.userDataDir}`,
      `--load-extension=${extensionPath}`,
      `--remote-debugging-port=${session.debuggingPort}`,
      '--no-first-run',
      '--no-default-browser-check',
      'chrome://extensions',
    ], {
      detached: false,
    });

    this.processes.set(sessionId, proc);

    proc.on('exit', async () => {
      await this.db.updateSession(sessionId, { status: 'stopping' });
      this.processes.delete(sessionId);
    });

    await this.db.updateSession(sessionId, { 
      status: 'running',
      pid: proc.pid,
    });
  }

  async stop(sessionId: string): Promise<void> {
    const proc = this.processes.get(sessionId);
    if (proc) {
      proc.kill();
      this.processes.delete(sessionId);
    }
    await this.db.removeSession(sessionId);
  }

  async stopByProject(projectId: string): Promise<void> {
    const sessions = this.db.sessions.filter(s => s.projectId === projectId);
    for (const session of sessions) {
      await this.stop(session.id);
    }
  }

  private async findFreePort(): Promise<number> {
    // 实现端口查找
    return 9222 + Math.floor(Math.random() * 1000);
  }

  private async resolveBrowserPath(browser: string): Promise<string> {
    // 复用 @addfox/rsbuild-plugin-extension-hmr 的浏览器路径解析
    // 或独立实现
    const paths: Record<string, string[]> = {
      chrome: [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      ],
      edge: [
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      ],
    };
    // ... 实现路径查找
    return paths[chrome]?.[0] || 'chrome';
  }
}
```

---

## 4. 运行模式

### 4.1 独立 CLI 模式

```bash
# 完全无 UI，纯命令行交互
$ hub list
┌────────────┬─────────────────────────────┬─────────┬─────────────────┐
│ ID         │ Name                        │ Tool    │ Status          │
├────────────┼─────────────────────────────┼─────────┼─────────────────┤
│ a1b2c3d4   │ my-extension                │ addfox  │ ● Running       │
│ e5f6g7h8   │ another-ext                 │ wxt     │ ○ Stopped       │
│ i9j0k1l2   │ legacy-ext                  │ vanilla │ ○ Stopped       │
└────────────┴─────────────────────────────┴─────────┴─────────────────┘

$ hub dev a1b2c3d4
✓ Build completed in 1.2s
✓ Chrome started on port 9222
✓ Extension loaded: chrome://extensions

# 另一个终端查看状态
$ hub status
Hub Server: not running
Active Sessions: 1
  - my-extension (Chrome) - PID 12345 - http://localhost:3040/sessions/a1b2c3

$ hub logs a1b2c3d4 --follow
[14:22:01] Extension starting...
[14:22:02] Content script injected
[14:22:05] Background service worker started
```

### 4.2 Server + UI 模式

```bash
# 启动 Server 并自动打开浏览器
$ hub start
✓ Hub Server started at http://localhost:3040
✓ Opening dashboard...

# 或者只启动 Server（不打开浏览器）
$ hub start --no-open

# 在另一个终端操作
$ hub dev a1b2c3d4  # CLI 命令会通过 API 与 Server 通信
```

### 4.3 混合模式

即使 Server 在运行，CLI 命令仍然可以独立工作：

```bash
# Terminal 1: 启动 Server
$ hub start --cli
Hub Server listening on port 3040

# Terminal 2: CLI 命令自动检测到 Server，通过 API 通信
$ hub list
# → 通过 HTTP API 获取数据，速度更快

# Terminal 3: 如果没有检测到 Server，直接操作数据库
$ hub stop a1b2c3d4
# → 直接操作数据库和进程
```

---

## 5. 与现有 addfox CLI 的关系

### 5.1 独立但互补

```
┌────────────────────────────────────────────────────────────────┐
│                      用户视角                                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   # 场景 1: 在 addfox 项目内快速启动 Hub                        │
│   $ cd my-addfox-project                                       │
│   $ addfox hub         # 快捷命令：启动 hub 并添加当前项目        │
│                                                                │
│   # 场景 2: 全局管理所有项目                                    │
│   $ hub                # 启动 Hub Dashboard                     │
│   $ hub dev proj_123   # 启动特定项目                           │
│                                                                │
│   # 场景 3: 纯 CLI 工作流                                       │
│   $ hub scan ~/Projects                                        │
│   $ hub list                                                   │
│   $ hub dev a1b2c3d4                                           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 5.2 在 addfox CLI 中添加 hub 快捷命令

```typescript
// packages/cli/src/commands/hub.ts
// 作为 addfox 的子命令，但只是快捷方式

export async function runHubCommand(args: string[]): Promise<void> {
  // 1. 确保 @addfox/hub 已安装
  const hubPath = resolveHubPackage();
  
  // 2. 将当前项目添加到 Hub（如果不在列表中）
  const currentProject = process.cwd();
  await ensureProjectInHub(currentProject);
  
  // 3. 启动 Hub
  const { spawn } = await import('child_process');
  const proc = spawn('node', [hubPath, ...args], {
    stdio: 'inherit',
  });
  
  await new Promise((resolve) => proc.on('exit', resolve));
}
```

这样 `addfox hub` 命令可以作为快捷方式存在，但 Hub 本身是独立的。

---

## 6. 数据流图

### 6.1 CLI 命令执行流程

```
用户输入: hub dev proj_123
        │
        ▼
┌───────────────────┐
│ CLI Parser        │
│ (commander.js)    │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ 检查 Server 状态   │
│ (端口是否占用)     │
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
┌───────┐   ┌───────────┐
│Server │   │Direct Mode│
│Running│   │(Server关) │
└───┬───┘   └─────┬─────┘
    │             │
    ▼             ▼
┌───────────┐ ┌───────────┐
│HTTP API   │ │Core API   │
│调用       │ │直接调用   │
└─────┬─────┘ └─────┬─────┘
      │             │
      └──────┬──────┘
             ▼
      ┌───────────────┐
      │ SessionManager│
      │  .create()    │
      └───────┬───────┘
              ▼
      ┌───────────────┐
      │ 启动 Builder   │
      │ (addfox/wxt)   │
      └───────┬───────┘
              ▼
      ┌───────────────┐
      │ 启动 Browser   │
      │ (Chrome)       │
      └───────┬───────┘
              ▼
      ┌───────────────┐
      │ 更新 Database  │
      │ (Session记录)  │
      └───────────────┘
```

### 6.2 Server 模式数据流

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  React   │────►│  HTTP    │────►│  Core    │
│   UI     │◄────│  API     │◄────│  Logic   │
└──────────┘     └──────────┘     └────┬─────┘
     │                                   │
     │ WebSocket                         ▼
     │                              ┌──────────┐
     └─────────────────────────────►│  JSON    │
                                    │   DB     │
                                    └──────────┘
```

---

## 7. 配置目录结构

```
~/.addfox-hub/                    # Hub 配置根目录
├── db.json                       # 主数据库（LowDB）
├── config.json                   # 用户配置
├── logs/                         # 日志目录
│   ├── hub.log                   # Hub 服务日志
│   ├── build-a1b2c3d4.log        # 项目构建日志
│   └── browser-a1b2c3d4.log      # 浏览器输出
├── cache/                        # 缓存目录
│   └── manifests/                # 缓存的 manifest
└── temp/                         # 临时文件
    └── chrome-profiles/          # Chrome 用户数据目录
        ├── sess_x9y8z7/          # 每个会话独立目录
        └── sess_abc123/
```

---

## 8. 实现优先级

### Phase 1: 核心 CLI (MVP)
- [ ] 包结构搭建
- [ ] LowDB 数据库层
- [ ] 项目扫描器（支持 addfox）
- [ ] CLI 命令: `hub`, `hub scan`, `hub list`, `hub dev`, `hub stop`
- [ ] Chromium 浏览器启动
- [ ] 基础日志输出

### Phase 2: UI 界面
- [ ] HTTP Server 框架
- [ ] REST API 实现
- [ ] Dashboard UI (React)
- [ ] WebSocket 实时通信

### Phase 3: 多工具支持
- [ ] WXT 适配器
- [ ] Plasmo 适配器
- [ ] Vanilla 适配器

### Phase 4: 高级功能
- [ ] Debug 面板 (CDP 集成)
- [ ] 多浏览器支持 (Edge, Brave)
- [ ] 构建历史记录
- [ ] 性能分析

---

## 9. 关键技术决策

| 决策 | 选择 | 理由 |
|------|------|------|
| **存储** | LowDB (JSON) | 零依赖、可读、轻量 |
| **CLI 框架** | Commander.js | 社区标准、TypeScript 支持好 |
| **HTTP 框架** | Fastify | 轻量、性能好、插件生态 |
| **UI 框架** | React + Vite | 熟悉、构建快 |
| **进程通信** | HTTP API + WS | 解耦、支持远程访问 |
| **浏览器控制** | CDP (原生) | 轻量、无需 Puppeteer/Playwright |

---

## 10. 命令速查表

```bash
# 启动
hub                           # 启动 Server + UI
hub start                     # 同上
hub start --cli               # 只启动 Server
hub start --port 8080         # 指定端口

# 项目管理
hub scan                      # 扫描配置目录
hub scan ~/Projects           # 扫描指定目录
hub scan --add ~/work         # 添加扫描目录
hub list                      # 列出项目
hub list --json               # JSON 输出

# 开发
hub dev <id>                  # 启动开发
hub dev <path>                # 通过路径启动
hub dev <id> -b edge          # 指定浏览器
hub stop <id>                 # 停止会话
hub stop --all                # 停止所有

# 监控
hub status                    # 查看状态
hub logs <id>                 # 查看日志
hub logs <id> -f              # 实时跟踪

# 配置
hub config                    # 查看配置
hub config set key value      # 设置配置
```
