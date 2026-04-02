// ============================================
// Hub Core Types
// ============================================

export type ExtensionTool = 'addfox' | 'wxt' | 'plasmo' | 'vanilla' | 'generic' | 'unknown';
export type BrowserType = 'chrome' | 'edge' | 'brave' | 'chromium';
export type ProcessStatus = SessionStatus;
export type SessionStatus = 'starting' | 'building' | 'running' | 'stopping' | 'error' | 'stopped' | 'crashed';
export type CliOutputMode = 'pretty' | 'json' | 'silent';

// ============================================
// Project Types
// ============================================

export interface ExtensionManifest {
  name: string;
  version: string;
  manifest_version: 2 | 3;
  description?: string;
  permissions?: string[];
  host_permissions?: string[];
  background?: {
    service_worker?: string;
    scripts?: string[];
    page?: string;
  };
  content_scripts?: Array<{
    matches: string[];
    js?: string[];
    css?: string[];
  }>;
  action?: {
    default_popup?: string;
    default_icon?: Record<string, string>;
  };
  icons?: Record<string, string>;
  [key: string]: any;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  tool: ExtensionTool;
  manifest?: ExtensionManifest;
  packageJson?: {
    name?: string;
    version?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
    hub?: {
      dev?: {
        command?: string;
        entrypointsDir?: string;
        outDir?: string;
      };
    };
  };
  workspace?: {
    root: string;
    name: string;
  };
  discoveredAt: string;
  lastModified: string;
  lastDevAt?: string;
  buildCount: number;
  devSessionCount: number;
  tags?: string[];
  source?: 'scan' | 'manual';
  devCommand?: string;
  buildCommand?: string;
}

// ============================================
// Session Types
// ============================================

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  source: 'build' | 'browser' | 'extension' | 'system' | 'stdout' | 'stderr';
  message: string;
  details?: any;
  metadata?: {
    processId?: number;
    tag?: string;
    [key: string]: any;
  };
}

export interface Session {
  id: string;
  projectId: string;
  projectName: string;
  browser: BrowserType;
  status: SessionStatus;
  pid?: number;
  buildPid?: number;
  debuggingPort?: number;
  userDataDir?: string;
  outputPath?: string;
  buildOutputPath?: string;
  serverUrl?: string;
  startedAt: string;
  stoppedAt?: string;
  logs: LogEntry[];
  errors: LogEntry[];
}

// ============================================
// Settings Types
// ============================================

export interface ScanConfig {
  enabled: boolean;
  paths: string[];
  maxDepth: number;
  includePatterns: string[];
  excludePatterns: string[];
}

export interface WorkspaceConfig {
  enabled: boolean;
  autoDetect: boolean;
  paths: string[];
}

export interface HubSettings {
  version: number;
  // Scan settings
  scan: ScanConfig;
  workspace: WorkspaceConfig;
  manualProjects: string[]; // 用户手动添加的项目路径
  // Browser settings
  defaultBrowser: BrowserType;
  browserPaths: Partial<Record<BrowserType, string>>;
  // Server settings
  serverPort: number;
  serverHost: string;
  autoOpenBrowser: boolean;
  // CLI settings
  cliOutput: CliOutputMode;
  // Log settings
  maxLogHistory: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// ============================================
// Database Schema
// ============================================

export interface HubDatabase {
  version: number;
  settings: HubSettings;
  projects: Project[];
  sessions: Session[];
}

// ============================================
// API Types
// ============================================

export interface CreateSessionRequest {
  projectId: string;
  browser?: BrowserType;
  headless?: boolean;
  noLaunch?: boolean;
  devCommand?: string; // Optional custom dev command override
}

export interface ScanRequest {
  path?: string;
  addToConfig?: boolean;
}

export interface AddProjectRequest {
  path: string;
  name?: string;
  tags?: string[];
}

// ============================================
// Workspace Types
// ============================================

export interface PnpmWorkspace {
  root: string;
  packages: string[];
}

export interface DetectedWorkspace {
  type: 'pnpm' | 'manual';
  root: string;
  name: string;
  projects: string[]; // 项目路径列表
}

// ============================================
// Adapter Types
// ============================================

export interface ToolAdapter {
  readonly name: ExtensionTool;
  detect(projectPath: string): Promise<boolean>;
  resolveConfig(projectPath: string): Promise<ToolConfig>;
  getDevOutputPath(projectPath: string): Promise<string>;
  getBuildOutputPath(projectPath: string): Promise<string>;
  startDev(projectPath: string, options: DevOptions): Promise<DevHandle>;
  build(projectPath: string, options: BuildOptions): Promise<BuildResult>;
  resolveManifest(projectPath: string): Promise<ExtensionManifest | undefined>;
}

export interface ToolConfig {
  entrypointsDir?: string;
  outDir?: string;
  [key: string]: any;
}

export interface DevOptions {
  browser?: BrowserType;
  port?: number;
  headless?: boolean;
  command?: string;
  onProgress?: (progress: number, message: string, stage?: BuildStage) => void;
}

export type BuildStage = 'init' | 'install' | 'build' | 'launch' | 'ready' | 'error';

export interface DevHandle {
  pid: number;
  outputPath: string;
  serverUrl?: string;
  close: () => Promise<void>;
  onBuildComplete?: (callback: (result: BuildResult) => void) => void;
  onProgress?: (callback: (progress: number, message: string, stage?: BuildStage) => void) => () => void;
}

export interface BuildOptions {
  target?: 'chromium' | 'firefox';
  mode?: 'development' | 'production';
  command?: string;
}

export interface BuildResult {
  success: boolean;
  outputPath: string;
  errors: string[];
  warnings: string[];
  duration: number;
}

// ============================================
// WebSocket Event Types
// ============================================

/**
 * Server -> Client event types
 */
export type ServerToClientEventType = 
  | 'session.created'
  | 'session.updated'
  | 'session.log'
  | 'session.build-progress'
  | 'project.updated'
  | 'stats.updated'
  | 'connection.established'
  | 'connection.error'
  | 'pong';

/**
 * Client -> Server event types
 */
export type ClientToServerEventType = 
  | 'ping'
  | 'subscribe'
  | 'unsubscribe'
  | 'auth';

/**
 * WebSocket message base interface
 */
export interface WebSocketMessage<T = unknown> {
  type: string;
  data?: T;
  timestamp?: string;
  connectionId?: string;
}

/**
 * Server to client event payload definitions
 */
export interface ServerToClientEvents {
  'session.created': { session: Session };
  'session.updated': { sessionId: string; updates: Partial<Session> };
  'session.log': { sessionId: string; entry: LogEntry };
  'session.build-progress': { 
    sessionId: string; 
    progress: number; 
    message: string;
    stage?: 'init' | 'build' | 'launch' | 'ready';
  };
  'project.updated': { projectId: string; project: Project };
  'stats.updated': { 
    stats: { 
      projects: number; 
      activeSessions: number; 
      totalSessions: number;
    };
  };
  'connection.established': { 
    connectionId: string;
    initialData: {
      stats: { projects: number; activeSessions: number; totalSessions: number };
      sessions: Session[];
    };
  };
  'connection.error': { 
    code: string;
    message: string;
  };
  'pong': { timestamp: number };
}

/**
 * Client to server event payload definitions
 */
export interface ClientToServerEvents {
  'ping': { timestamp?: number };
  'subscribe': { 
    channels: ('all' | `session:${string}` | `project:${string}` | 'stats')[];
  };
  'unsubscribe': { 
    channels: ('all' | `session:${string}` | `project:${string}` | 'stats')[];
  };
  'auth': { token: string };
}

/**
 * Typed WebSocket message for server to client communication
 */
export type ServerToClientMessage<T extends keyof ServerToClientEvents = keyof ServerToClientEvents> = {
  type: T;
  data: ServerToClientEvents[T];
  timestamp: string;
  connectionId?: string;
};

/**
 * Typed WebSocket message for client to server communication
 */
export type ClientToServerMessage<T extends keyof ClientToServerEvents = keyof ClientToServerEvents> = {
  type: T;
  data: ClientToServerEvents[T];
  timestamp?: string;
};

/**
 * WebSocket subscription channels
 */
export type SubscriptionChannel = 
  | 'all'
  | `session:${string}`
  | `project:${string}`
  | 'stats';

/**
 * WebSocket connection metadata
 */
export interface WebSocketConnectionMeta {
  connectionId: string;
  connectedAt: Date;
  lastPingAt: Date;
  isAuthenticated: boolean;
  subscriptions: Set<SubscriptionChannel>;
  clientInfo?: {
    userAgent?: string;
    ip?: string;
  };
}
