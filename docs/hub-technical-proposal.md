# Addfox Hub 技术方案

## 1. 概述

### 1.1 什么是 Hub

Hub 是一个**本地运行的插件管理中心**，提供以下核心能力：

- **插件管理中心**：浏览、管理本地所有的浏览器扩展项目
- **启动台**：一键启动插件开发环境（自动打开浏览器并加载扩展）
- **Debug 工具**：实时查看插件日志、错误、性能数据
- **跨工具兼容**：支持 addfox、WXT、Plasmo 等不同开发工具创建的扩展项目

### 1.2 核心挑战

| 挑战 | 说明 |
|------|------|
| 多插件管理 | 如何发现并识别工作区中的多个插件项目 |
| 浏览器管理 | 如何同时管理多个浏览器实例，每个加载不同插件 |
| 工具兼容 | 如何适配不同构建工具的输出格式和开发协议 |
| 扩展隔离 | 如何在同一浏览器中隔离运行多个扩展（或启动多个浏览器实例） |

---

## 2. 整体架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Addfox Hub (localhost:3000)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Dashboard   │  │ Plugin Mgr   │  │ Browser Mgr  │  │ Debug Panel  │   │
│  │   (UI)       │  │    (UI)      │  │    (UI)      │  │    (UI)      │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         └─────────────────┴─────────────────┴─────────────────┘            │
│                                    │                                        │
│                         ┌──────────▼──────────┐                            │
│                         │    Hub Server       │                            │
│                         │  (Express/Fastify)  │                            │
│                         └──────────┬──────────┘                            │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          │                          │                          │
┌─────────▼─────────┐    ┌───────────▼────────────┐  ┌──────────▼──────────┐
│  Project Scanner  │    │   Browser Controller   │  │  Tool Adapters      │
│                 │    │                        │  │                     │
│ - Workspace scan│    │ - Chrome Launcher      │  │ - AddfoxAdapter     │
│ - Manifest parse│    │ - Firefox (web-ext)    │  │ - WxtAdapter        │
│ - Tool detection│    │ - Profile isolation    │  │ - PlasmoAdapter     │
│ - Project state │    │ - Extension lifecycle  │  │ - VanillaAdapter    │
└─────────────────┘    └────────────────────────┘  └─────────────────────┘
```

---

## 3. 核心模块设计

### 3.1 项目扫描器 (Project Scanner)

#### 3.1.1 扫描策略

```typescript
interface ScanStrategy {
  // 扫描路径配置
  roots: string[];           // 扫描根目录，如 ["~/projects", "~/workspace"]
  maxDepth: number;          // 最大扫描深度
  includePatterns: string[]; // 包含模式，如 ["**/manifest.json", "**/wxt.config.*"]
  excludePatterns: string[]; // 排除模式，如 ["**/node_modules/**", "**/.git/**"]
}
```

#### 3.1.2 项目识别逻辑

```typescript
interface DetectedProject {
  id: string;                    // 唯一标识 (hash of path)
  name: string;                  // 项目名称
  path: string;                  // 绝对路径
  tool: 'addfox' | 'wxt' | 'plasmo' | 'vanilla' | 'unknown';
  manifest?: ExtensionManifest;  // 解析后的 manifest
  packageJson?: PackageJson;     // package.json 内容
  configFile?: string;           // 配置文件路径
  entries?: EntryInfo[];         // 入口信息 (addfox 专用)
  state: 'discovered' | 'initialized' | 'building' | 'ready' | 'error';
  lastModified: Date;
}

// 工具检测规则
const TOOL_DETECTION_RULES = {
  addfox: {
    configFiles: ['addfox.config.ts', 'addfox.config.js', 'addfox.config.mjs'],
    dependencies: ['addfox', '@addfox/core'],
    manifestLocations: ['app/manifest.json', 'manifest.json'],
  },
  wxt: {
    configFiles: ['wxt.config.ts', 'wxt.config.js'],
    dependencies: ['wxt'],
    manifestLocations: ['.output/manifest.json', 'manifest.json'],
  },
  plasmo: {
    configFiles: ['plasmo.config.js', 'plasmo.config.ts'],
    dependencies: ['plasmo'],
    manifestLocations: ['.plasmo/manifest.json', 'manifest.json'],
  },
  vanilla: {
    configFiles: [],
    dependencies: [],
    manifestLocations: ['manifest.json'],
  },
};
```

#### 3.1.3 扫描流程

```
1. 读取 Hub 配置的扫描根目录
2. 并发扫描所有根目录
3. 对每个找到的目录：
   a. 检测是否存在 manifest.json 或配置文件
   b. 读取 package.json 检测依赖
   c. 根据规则匹配工具类型
   d. 解析 manifest 获取扩展信息
   e. 存入项目数据库
4. 监听文件变化，增量更新项目列表
```

### 3.2 浏览器控制器 (Browser Controller)

#### 3.2.1 设计原则

由于 Chrome 扩展的安全限制，**同一浏览器实例无法同时加载多个开发版本的扩展**（它们会相互干扰）。因此采用以下策略：

| 场景 | 策略 |
|------|------|
| 单插件开发 | 启动一个浏览器实例，加载该插件 |
| 多插件并行开发 | 每个插件使用独立的 UserDataDir 启动独立浏览器实例 |
| 插件组合测试 | 将多个插件打包到同一目录，作为单个扩展加载 |

#### 3.2.2 浏览器实例管理

```typescript
interface BrowserInstance {
  id: string;
  type: 'chrome' | 'edge' | 'brave' | 'firefox';
  process: ChildProcess;
  userDataDir: string;
  extensions: string[];  // 加载的扩展路径列表
  debuggingPort?: number; // Chrome DevTools Protocol 端口
  wsEndpoint?: string;    // Puppeteer/Playwright 连接端点
  state: 'starting' | 'running' | 'stopping' | 'crashed';
  startedAt: Date;
  metadata: {
    projects: string[];   // 关联的项目ID
    purpose: 'dev' | 'test' | 'debug';
  };
}

interface BrowserManager {
  // 启动浏览器开发会话
  launchDevSession(
    project: DetectedProject,
    options: DevSessionOptions
  ): Promise<BrowserInstance>;

  // 停止浏览器实例
  stopInstance(instanceId: string): Promise<void>;

  // 获取所有运行中的实例
  listInstances(): BrowserInstance[];

  // 通过 CDP 与浏览器通信
  sendCDPCommand(instanceId: string, command: CDPCommand): Promise<any>;
}
```

#### 3.2.3 Chrome 启动参数

```typescript
const CHROME_FLAGS = [
  // 扩展加载
  `--load-extension=${extensionPaths.join(',')}`,
  
  // 独立用户数据目录（关键：隔离不同会话）
  `--user-data-dir=${userDataDir}`,
  
  // 开发友好设置
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-default-apps',
  '--disable-popup-blocking',
  '--disable-extensions-except=',  // 只加载指定扩展
  
  // 调试支持
  `--remote-debugging-port=${debuggingPort}`,
  
  // 安全/隐私（开发环境）
  '--disable-web-security',  // 允许跨域（可选）
  '--allow-insecure-localhost',
];
```

### 3.3 工具适配器层 (Tool Adapters)

这是实现跨工具兼容的核心层。

#### 3.3.1 适配器接口

```typescript
interface ToolAdapter {
  readonly name: string;
  
  // 检测项目是否使用该工具
  detect(projectPath: string): Promise<boolean>;
  
  // 解析项目配置
  resolveConfig(projectPath: string): Promise<ToolConfig>;
  
  // 获取开发构建输出目录
  getDevOutputPath(projectPath: string): Promise<string>;
  
  // 获取生产构建输出目录
  getBuildOutputPath(projectPath: string): Promise<string>;
  
  // 启动开发服务器（如适用）
  startDevServer?(
    projectPath: string,
    options: DevServerOptions
  ): Promise<DevServerHandle>;
  
  // 执行构建
  build(projectPath: string, options: BuildOptions): Promise<BuildResult>;
  
  // 获取入口信息
  getEntries(projectPath: string): Promise<EntryInfo[]>;
  
  // 解析 manifest
  resolveManifest(projectPath: string): Promise<ExtensionManifest>;
}
```

#### 3.3.2 Addfox 适配器

```typescript
class AddfoxAdapter implements ToolAdapter {
  name = 'addfox';

  async detect(projectPath: string): Promise<boolean> {
    return hasAnyFile(projectPath, [
      'addfox.config.ts',
      'addfox.config.js',
      'addfox.config.mjs'
    ]);
  }

  async resolveConfig(projectPath: string): Promise<ToolConfig> {
    // 使用 @addfox/core 的 resolveAddfoxConfig
    const { config, entries } = resolveAddfoxConfig(projectPath);
    return {
      config,
      entries,
      manifest: config.manifest,
    };
  }

  async getDevOutputPath(projectPath: string): Promise<string> {
    const config = await this.resolveConfig(projectPath);
    return resolve(projectPath, '.addfox', config.outDir ?? 'extension');
  }

  async startDevServer(
    projectPath: string,
    options: DevServerOptions
  ): Promise<DevServerHandle> {
    // 复用现有的 addfox dev 逻辑
    // 但不启动浏览器，只启动 Rsbuild dev server
    const pipeline = await runPipeline({
      root: projectPath,
      command: 'dev',
      browser: options.browser ?? 'chromium',
      launch: options.browser ?? 'chrome',
      // ... 其他选项
    });
    
    return {
      close: () => pipeline.close(),
      onBuildComplete: pipeline.onBuildComplete,
    };
  }
}
```

#### 3.3.3 WXT 适配器

```typescript
class WxtAdapter implements ToolAdapter {
  name = 'wxt';

  async detect(projectPath: string): Promise<boolean> {
    return hasAnyFile(projectPath, ['wxt.config.ts', 'wxt.config.js']) ||
           hasDependency(projectPath, 'wxt');
  }

  async resolveConfig(projectPath: string): Promise<ToolConfig> {
    // WXT 配置可能包含 entrypointsDir 等
    const configPath = findFile(projectPath, ['wxt.config.ts', 'wxt.config.js']);
    if (!configPath) throw new Error('WXT config not found');
    
    // 动态导入 WXT 配置
    const config = await import(configPath).then(m => m.default ?? m);
    return {
      entrypointsDir: config.entrypointsDir ?? 'entrypoints',
      ...config,
    };
  }

  async getDevOutputPath(projectPath: string): Promise<string> {
    // WXT 默认输出到 .output/
    return resolve(projectPath, '.output');
  }

  async startDevServer(
    projectPath: string,
    options: DevServerOptions
  ): Promise<DevServerHandle> {
    // 调用 wxt 的 dev 命令
    const { spawn } = await import('child_process');
    const proc = spawn('npx', ['wxt', 'dev', '--port', String(options.port)], {
      cwd: projectPath,
      stdio: 'pipe',
    });

    return {
      close: () => {
        proc.kill();
      },
      // WXT 的 manifest 在 .output/manifest.json
      outputPath: resolve(projectPath, '.output'),
    };
  }
}
```

#### 3.3.4 Plasmo 适配器

```typescript
class PlasmoAdapter implements ToolAdapter {
  name = 'plasmo';

  async detect(projectPath: string): Promise<boolean> {
    return hasDependency(projectPath, 'plasmo');
  }

  async getDevOutputPath(projectPath: string): Promise<string> {
    // Plasmo 默认输出到 .plasmo/
    return resolve(projectPath, '.plasmo');
  }

  async startDevServer(
    projectPath: string,
    options: DevServerOptions
  ): Promise<DevServerHandle> {
    // Plasmo 使用 plasmo dev 命令
    const proc = spawn('npx', ['plasmo', 'dev'], {
      cwd: projectPath,
      stdio: 'pipe',
    });

    return {
      close: () => proc.kill(),
      outputPath: resolve(projectPath, '.plasmo'),
    };
  }
}
```

#### 3.3.5 Vanilla 适配器（通用 fallback）

```typescript
class VanillaAdapter implements ToolAdapter {
  name = 'vanilla';

  async detect(projectPath: string): Promise<boolean> {
    // 只要有 manifest.json 但没有其他工具配置
    const hasManifest = existsSync(resolve(projectPath, 'manifest.json'));
    const hasOtherTool = await Promise.any([
      new AddfoxAdapter().detect(projectPath),
      new WxtAdapter().detect(projectPath),
      new PlasmoAdapter().detect(projectPath),
    ]).catch(() => false);
    
    return hasManifest && !hasOtherTool;
  }

  async resolveManifest(projectPath: string): Promise<ExtensionManifest> {
    const manifestPath = resolve(projectPath, 'manifest.json');
    const content = await readFile(manifestPath, 'utf-8');
    return JSON.parse(content);
  }

  async getDevOutputPath(projectPath: string): Promise<string> {
    // Vanilla 项目直接使用源码目录
    return projectPath;
  }
}
```

### 3.4 Hub Server API

```typescript
// REST API 设计

// ===== 项目管理 =====
GET    /api/projects              // 列出所有项目
GET    /api/projects/:id          // 获取项目详情
POST   /api/projects/:id/refresh  // 重新扫描项目
DELETE /api/projects/:id          // 从 Hub 移除项目（不删除文件）

// ===== 开发会话 =====
POST   /api/sessions              // 创建开发会话
{
  projectId: string;
  browser: 'chrome' | 'firefox' | 'edge';
  options?: {
    headless?: boolean;
    debugging?: boolean;
    incognito?: boolean;
  };
}

GET    /api/sessions              // 列出所有会话
GET    /api/sessions/:id          // 获取会话详情
DELETE /api/sessions/:id          // 停止会话

// ===== 构建管理 =====
POST   /api/projects/:id/build    // 触发构建
GET    /api/builds/:id            // 获取构建状态/日志

// ===== 调试数据 =====
GET    /api/sessions/:id/logs     // 获取控制台日志
GET    /api/sessions/:id/errors   // 获取错误报告
GET    /api/sessions/:id/network   // 获取网络请求

// WebSocket 事件
WS     /ws                       // 实时事件流
// events: 
// - project:discovered
// - project:changed
// - build:start, build:complete, build:error
// - session:start, session:stop
// - log:console, log:error
```

---

## 4. 关键技术问题解决方案

### 4.1 问题：如何同时管理多个插件？

#### 方案 A：多浏览器实例（推荐用于独立开发）

```
每个插件 → 独立的 Chrome 实例（不同的 --user-data-dir）

优点：
- 完全隔离，互不干扰
- 每个实例可以有不同的扩展配置
- 崩溃不影响其他实例

缺点：
- 内存占用较高
- 多个浏览器窗口可能混乱
```

实现：
```typescript
class MultiInstanceManager {
  private instances = new Map<string, BrowserInstance>();

  async createInstance(
    projectId: string,
    browserType: BrowserType
  ): Promise<BrowserInstance> {
    const userDataDir = join(HUB_TMP_DIR, `chrome-${projectId}-${Date.now()}`);
    await mkdir(userDataDir, { recursive: true });

    const instance: BrowserInstance = {
      id: generateId(),
      type: browserType,
      userDataDir,
      extensions: [await this.getProjectOutputPath(projectId)],
      // ...
    };

    // 启动浏览器
    const proc = spawn(browserPath, [
      `--user-data-dir=${userDataDir}`,
      `--load-extension=${instance.extensions.join(',')}`,
      '--remote-debugging-port=0', // 自动分配端口
    ]);

    instance.process = proc;
    this.instances.set(instance.id, instance);
    return instance;
  }
}
```

#### 方案 B：单浏览器 + 扩展切换（推荐用于快速测试）

```
一个 Chrome 实例 → 动态加载/卸载扩展

优点：
- 资源占用低
- 窗口管理简单

缺点：
- 需要 Chrome DevTools Protocol 控制
- 扩展切换需要时间
- 某些扩展可能需要浏览器重启
```

实现：
```typescript
class ExtensionSwitcher {
  async switchExtension(
    cdpConnection: CDPConnection,
    oldExtensionId: string | null,
    newExtensionPath: string
  ): Promise<string> {
    // 通过 Chrome DevTools Protocol 管理扩展
    
    // 1. 卸载旧扩展
    if (oldExtensionId) {
      await cdpConnection.send('Management.uninstallSelf', {
        id: oldExtensionId,
      });
    }

    // 2. 安装新扩展
    const result = await cdpConnection.send('Extensions.loadUnpacked', {
      path: newExtensionPath,
    });

    return result.id;
  }
}
```

### 4.2 问题：如何处理不同工具的构建流程？

#### 统一构建抽象

```typescript
interface BuildPipeline {
  // 每个项目关联一个构建管道
  project: DetectedProject;
  adapter: ToolAdapter;
  
  // 当前状态
  state: 'idle' | 'building' | 'watching' | 'error';
  
  // 执行构建
  build(): Promise<BuildResult>;
  
  // 启动 watch 模式
  watch(onChange: (result: BuildResult) => void): Promise<void>;
  
  // 停止 watch
  unwatch(): Promise<void>;
}

class BuildPipelineManager {
  private pipelines = new Map<string, BuildPipeline>();

  async getOrCreatePipeline(projectId: string): Promise<BuildPipeline> {
    if (this.pipelines.has(projectId)) {
      return this.pipelines.get(projectId)!;
    }

    const project = await this.getProject(projectId);
    const adapter = await this.resolveAdapter(project);
    
    const pipeline: BuildPipeline = {
      project,
      adapter,
      state: 'idle',
      build: () => adapter.build(project.path, {}),
      watch: (onChange) => this.startWatch(pipeline, onChange),
      unwatch: () => this.stopWatch(pipeline),
    };

    this.pipelines.set(projectId, pipeline);
    return pipeline;
  }
}
```

### 4.3 问题：如何实现 Debug 面板？

#### 方案：Chrome DevTools Protocol + 日志转发

```typescript
interface DebugService {
  // 连接到浏览器的 CDP
  connect(debuggingPort: number): Promise<CDPConnection>;
  
  // 监听控制台日志
  onConsoleLog(callback: (log: ConsoleLog) => void): void;
  
  // 监听网络请求
  onNetworkActivity(callback: (req: NetworkRequest) => void): void;
  
  // 监听扩展错误
  onExtensionError(callback: (err: ExtensionError) => void): void;
}

// 在 Hub Server 中实现
class HubDebugService implements DebugService {
  private connections = new Map<string, CDPConnection>();

  async attachToSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    const cdp = await CDP({ port: session.debuggingPort });
    
    this.connections.set(sessionId, cdp);

    // 启用相关域
    await cdp.Runtime.enable();
    await cdp.Log.enable();
    await cdp.Network.enable({});

    // 转发日志到 WebSocket
    cdp.Runtime.on('consoleAPICalled', (params) => {
      this.broadcast(sessionId, {
        type: 'console',
        level: params.type,
        message: params.args.map(a => a.value).join(' '),
        timestamp: Date.now(),
      });
    });

    cdp.Log.on('entryAdded', (params) => {
      this.broadcast(sessionId, {
        type: 'log',
        level: params.entry.level,
        message: params.entry.text,
        source: params.entry.source,
        timestamp: params.entry.timestamp,
      });
    });
  }
}
```

---

## 5. 用户工作流程

### 5.1 启动 Hub

```bash
# 全局安装 Hub（可选）
npm install -g @addfox/hub

# 启动 Hub
addfox-hub
# 或
npx @addfox/hub

# 自动打开浏览器访问 http://localhost:3040
```

### 5.2 首次使用配置

```
1. Hub 启动后，扫描配置的目录（默认：~/Projects, ~/workspace）
2. 在 Dashboard 显示发现的所有扩展项目
3. 用户可以：
   - 添加更多扫描目录
   - 手动导入项目
   - 配置默认浏览器偏好
```

### 5.3 日常开发流程

```
1. 打开 Hub Dashboard (localhost:3040)
2. 浏览项目列表，点击要开发的项目
3. 选择目标浏览器，点击 "Start Dev"
4. Hub 自动：
   a. 启动该项目的开发服务器（addfox dev / wxt dev 等）
   b. 等待首次构建完成
   c. 启动浏览器实例，加载扩展
   d. 打开 Debug 面板
5. 开发者编辑代码 → 自动 HMR → 浏览器自动刷新
6. 点击 "Stop" 关闭浏览器和开发服务器
```

### 5.4 多插件并行开发

```
场景：同时开发插件 A 和插件 B

方式 1：完全隔离
- 在项目 A 点击 "Start Dev" → 启动 Chrome 实例 1
- 在项目 B 点击 "Start Dev" → 启动 Chrome 实例 2
- 两个独立窗口，完全隔离

方式 2：快速切换（未来优化）
- Hub 保持一个 Chrome 实例运行
- 点击项目 A → 加载扩展 A
- 点击项目 B → 卸载 A，加载 B
```

---

## 6. 目录结构

```
packages/
├── hub/                          # Hub 主包
│   ├── package.json
│   ├── src/
│   │   ├── server/              # Hub Server
│   │   │   ├── index.ts         # 服务入口
│   │   │   ├── routes/          # API 路由
│   │   │   │   ├── projects.ts
│   │   │   │   ├── sessions.ts
│   │   │   │   ├── builds.ts
│   │   │   │   └── debug.ts
│   │   │   └── websocket.ts     # WebSocket 事件
│   │   ├── core/                # 核心逻辑
│   │   │   ├── scanner/         # 项目扫描
│   │   │   │   ├── index.ts
│   │   │   │   └── watcher.ts   # 文件监听
│   │   │   ├── browser/         # 浏览器管理
│   │   │   │   ├── launcher.ts
│   │   │   │   ├── cdp.ts       # CDP 封装
│   │   │   │   └── profiles.ts  # 用户数据目录管理
│   │   │   ├── adapters/        # 工具适配器
│   │   │   │   ├── index.ts
│   │   │   │   ├── addfox.ts
│   │   │   │   ├── wxt.ts
│   │   │   │   ├── plasmo.ts
│   │   │   │   └── vanilla.ts
│   │   │   └── debug/           # Debug 服务
│   │   │       ├── index.ts
│   │   │       ├── collector.ts
│   │   │       └── broadcaster.ts
│   │   ├── cli/                 # CLI 入口
│   │   │   └── index.ts
│   │   └── types.ts             # 共享类型
│   └── ui/                      # Hub UI (可选分离)
│       ├── src/
│       │   ├── App.tsx
│       │   ├── pages/
│       │   │   ├── Dashboard.tsx
│       │   │   ├── ProjectDetail.tsx
│       │   │   └── DebugPanel.tsx
│       │   └── components/
│       └── package.json
```

---

## 7. 实现路线图

### Phase 1: MVP (核心功能)

- [ ] Hub Server 基础框架
- [ ] 项目扫描器（支持 addfox 项目）
- [ ] 浏览器启动器（Chrome/Edge）
- [ ] 基础 Dashboard UI
- [ ] 单项目开发流程

### Phase 2: 多工具支持

- [ ] WXT 适配器
- [ ] Plasmo 适配器
- [ ] Vanilla 适配器
- [ ] 项目状态管理增强

### Phase 3: Debug 能力

- [ ] Chrome DevTools Protocol 集成
- [ ] 实时日志面板
- [ ] 错误监控
- [ ] 网络请求查看

### Phase 4: 高级功能

- [ ] Firefox 支持
- [ ] 多项目并行开发
- [ ] 扩展组合测试
- [ ] 性能分析

---

## 8. 与现有 addfox 的关系

```
┌─────────────────────────────────────────────────────────────┐
│                        Addfox Ecosystem                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   @addfox   │    │  @addfox    │    │ @addfox/hub │     │
│  │    /cli     │    │   /core     │    │  (new)      │     │
│  │             │    │             │    │             │     │
│  │ Single proj │    │ Config/     │    │ Multi proj  │     │
│  │   dev tool  │◄───┤ Entry/Mani  │◄───┤  mgmt tool  │     │
│  │             │    │  fest logic │    │             │     │
│  └─────────────┘    └─────────────┘    └──────┬──────┘     │
│         │                                      │            │
│         │         ┌────────────────────────────┘            │
│         │         │                                         │
│         └─────────┴────────────────────────────────────►    │
│                        共享底层能力                         │
│           (browser launch, HMR, manifest build)             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Hub 是对 addfox CLI 的补充而非替代：

- **addfox CLI**: 专注单个项目的开发，轻量、快速
- **addfox Hub**: 专注多个项目的管理和协调，可视化、集中式

两者共享 @addfox/core 的底层能力（配置解析、entry 发现、manifest 构建等）。

---

## 9. 附录：关键技术调研

### 9.1 Chrome DevTools Protocol

```typescript
// CDP 关键命令
const CDP_COMMANDS = {
  // 扩展管理
  'Extensions.loadUnpacked': { path: string } => { id: string },
  'Extensions.uninstall': { id: string } => void,
  
  // 运行时
  'Runtime.enable': () => void,
  'Runtime.evaluate': { expression: string } => { result: RemoteObject },
  
  // 日志
  'Log.enable': () => void,
  'Log.entryAdded': Event<{ entry: LogEntry }>,
  
  // 网络
  'Network.enable': () => void,
  'Network.requestWillBeSent': Event<{ requestId: string, request: Request }>,
};
```

### 9.2 web-ext (Firefox)

```typescript
// web-ext 的 programmatic API
import webExt from 'web-ext';

const runner = await webExt.default.cmd.run({
  sourceDir: '/path/to/extension',
  target: 'firefox-desktop',
  firefox: '/path/to/firefox',
  devtools: true,
  browserConsole: true,
  noReload: false,  // 允许自动重载
}, {
  shouldExitProgram: false,
});

// 停止
await runner.exit();
```

### 9.3 项目检测优先级

```
检测顺序（从高优先级到低）：

1. addfox.config.ts/js/mjs → addfox 项目
2. wxt.config.ts/js → WXT 项目  
3. plasmo.config.js → Plasmo 项目
4. package.json dependencies → 根据依赖推断
5. manifest.json 存在 → Vanilla 项目
```
