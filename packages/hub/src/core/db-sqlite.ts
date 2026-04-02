// @ts-ignore - better-sqlite3 may not be installed
import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync } from 'fs';
import type { HubSettings, Project, Session, LogEntry } from '../types.js';
import { getEventBus } from './event-bus.js';

// Default settings
const DEFAULT_SETTINGS: HubSettings = {
  version: 1,
  scan: {
    enabled: true,
    paths: [join(homedir(), 'Projects'), join(homedir(), 'workspace')],
    maxDepth: 3,
    includePatterns: ['**/manifest.json', '**/manifest.ts', '**/addfox.config.*', '**/wxt.config.*'],
    excludePatterns: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/.output/**', '**/.addfox/**'],
  },
  workspace: {
    enabled: true,
    autoDetect: true,
    paths: [],
  },
  manualProjects: [],
  defaultBrowser: 'chrome',
  browserPaths: {},
  serverPort: 3040,
  serverHost: '127.0.0.1',
  autoOpenBrowser: true,
  cliOutput: 'pretty',
  maxLogHistory: 1000,
  logLevel: 'info',
};

// SQL Schema
const SCHEMA = `
-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  tool TEXT NOT NULL,
  manifest TEXT,
  package_json TEXT,
  workspace_root TEXT,
  workspace_name TEXT,
  discovered_at TEXT NOT NULL,
  last_modified TEXT NOT NULL,
  last_dev_at TEXT,
  build_count INTEGER DEFAULT 0,
  dev_session_count INTEGER DEFAULT 0,
  tags TEXT
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  browser TEXT NOT NULL,
  status TEXT NOT NULL,
  pid INTEGER,
  build_pid INTEGER,
  debugging_port INTEGER,
  user_data_dir TEXT,
  output_path TEXT,
  build_output_path TEXT,
  server_url TEXT,
  started_at TEXT NOT NULL,
  stopped_at TEXT
);

-- Logs table
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  level TEXT NOT NULL,
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  details TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_logs_session ON logs(session_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
`;

export class HubDBSQLite {
  private db: Database.Database;
  private configDir: string;
  private eventBus = getEventBus();

  constructor(configDir?: string) {
    this.configDir = configDir || join(homedir(), '.addfox-hub');
    this.ensureConfigDir();
    
    const dbPath = join(this.configDir, 'hub.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    
    this.initSchema();
  }

  private ensureConfigDir(): void {
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }
    const subdirs = ['logs', 'temp', 'temp/chrome-profiles'];
    for (const dir of subdirs) {
      const path = join(this.configDir, dir);
      if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
      }
    }
  }

  private initSchema(): void {
    this.db.exec(SCHEMA);
    
    // Insert default settings if not exists
    const settings = this.getSettings();
    if (!settings) {
      this.saveSettings(DEFAULT_SETTINGS);
    }
  }

  getConfigDir(): string {
    return this.configDir;
  }

  async init(): Promise<void> {
    // Database is already initialized in constructor
    // This method exists for API compatibility with HubDB
  }

  // Settings
  private getSettings(): HubSettings | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get('settings') as { value: string } | undefined;
    return row ? JSON.parse(row.value) : null;
  }

  private saveSettings(settings: HubSettings): void {
    this.db.prepare(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
    ).run('settings', JSON.stringify(settings));
  }

  get settings(): HubSettings {
    return this.getSettings() || DEFAULT_SETTINGS;
  }

  async updateSettings(updates: Partial<HubSettings>): Promise<void> {
    const current = this.settings;
    const updated = { ...current, ...updates };
    this.saveSettings(updated);
  }

  async addScanPath(path: string): Promise<void> {
    const settings = this.settings;
    if (!settings.scan.paths.includes(path)) {
      settings.scan.paths.push(path);
      await this.updateSettings({ scan: settings.scan });
    }
  }

  async removeScanPath(path: string): Promise<void> {
    const settings = this.settings;
    settings.scan.paths = settings.scan.paths.filter(p => p !== path);
    await this.updateSettings({ scan: settings.scan });
  }

  async addManualProject(path: string): Promise<void> {
    const settings = this.settings;
    if (!settings.manualProjects.includes(path)) {
      settings.manualProjects.push(path);
      await this.updateSettings({ manualProjects: settings.manualProjects });
    }
  }

  async removeManualProject(path: string): Promise<void> {
    const settings = this.settings;
    settings.manualProjects = settings.manualProjects.filter(p => p !== path);
    await this.updateSettings({ manualProjects: settings.manualProjects });
  }

  async addWorkspacePath(path: string): Promise<void> {
    const settings = this.settings;
    if (!settings.workspace.paths.includes(path)) {
      settings.workspace.paths.push(path);
      await this.updateSettings({ workspace: settings.workspace });
    }
  }

  // Projects
  get projects(): Project[] {
    const rows = this.db.prepare('SELECT * FROM projects').all() as any[];
    return rows.map(row => this.rowToProject(row));
  }

  private rowToProject(row: any): Project {
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      tool: row.tool,
      manifest: row.manifest ? JSON.parse(row.manifest) : undefined,
      packageJson: row.package_json ? JSON.parse(row.package_json) : undefined,
      workspace: row.workspace_root ? {
        root: row.workspace_root,
        name: row.workspace_name,
      } : undefined,
      discoveredAt: row.discovered_at,
      lastModified: row.last_modified,
      lastDevAt: row.last_dev_at,
      buildCount: row.build_count,
      devSessionCount: row.dev_session_count,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
    };
  }

  async addProject(project: Project): Promise<void> {
    const existing = this.db.prepare('SELECT id FROM projects WHERE id = ?').get(project.id) as { id: string } | undefined;
    
    this.db.prepare(`
      INSERT OR REPLACE INTO projects 
      (id, name, path, tool, manifest, package_json, workspace_root, workspace_name, 
       discovered_at, last_modified, last_dev_at, build_count, dev_session_count, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      project.id,
      project.name,
      project.path,
      project.tool,
      project.manifest ? JSON.stringify(project.manifest) : null,
      project.packageJson ? JSON.stringify(project.packageJson) : null,
      project.workspace?.root || null,
      project.workspace?.name || null,
      project.discoveredAt,
      project.lastModified,
      project.lastDevAt || null,
      project.buildCount || 0,
      project.devSessionCount || 0,
      project.tags ? JSON.stringify(project.tags) : null
    );

    // Emit event
    if (existing) {
      this.eventBus.emit('project:updated', { 
        projectId: project.id, 
        updates: project, 
        project 
      });
    } else {
      this.eventBus.emit('project:created', { project });
    }
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    const current = this.getProjectById(id);
    if (!current) return;

    const updated = { ...current, ...updates };
    await this.addProject(updated);
    
    this.eventBus.emit('project:updated', { 
      projectId: id, 
      updates, 
      project: updated 
    });
  }

  async removeProject(id: string): Promise<void> {
    // Delete related sessions and logs
    const sessions = this.getSessionsByProject(id);
    for (const session of sessions) {
      this.db.prepare('DELETE FROM logs WHERE session_id = ?').run(session.id);
    }
    this.db.prepare('DELETE FROM sessions WHERE project_id = ?').run(id);
    this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    
    this.eventBus.emit('project:deleted', { projectId: id });
  }

  getProjectById(id: string): Project | undefined {
    const row = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
    return row ? this.rowToProject(row) : undefined;
  }

  getProjectByPath(path: string): Project | undefined {
    const row = this.db.prepare('SELECT * FROM projects WHERE path = ?').get(path) as any;
    return row ? this.rowToProject(row) : undefined;
  }

  // Sessions
  get sessions(): Session[] {
    const rows = this.db.prepare('SELECT * FROM sessions').all() as any[];
    return rows.map(row => this.rowToSession(row));
  }

  private rowToSession(row: any): Session {
    return {
      id: row.id,
      projectId: row.project_id,
      projectName: row.project_name,
      browser: row.browser,
      status: row.status,
      pid: row.pid,
      buildPid: row.build_pid,
      debuggingPort: row.debugging_port,
      userDataDir: row.user_data_dir,
      outputPath: row.output_path,
      buildOutputPath: row.build_output_path,
      serverUrl: row.server_url,
      startedAt: row.started_at,
      stoppedAt: row.stopped_at,
      logs: [],
      errors: [],
    };
  }

  get activeSessions(): Session[] {
    return this.sessions.filter(s => 
      s.status === 'running' || s.status === 'starting' || s.status === 'building'
    );
  }

  async addSession(session: Session): Promise<void> {
    this.db.prepare(`
      INSERT INTO sessions 
      (id, project_id, project_name, browser, status, pid, build_pid, debugging_port,
       user_data_dir, output_path, build_output_path, server_url, started_at, stopped_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      session.projectId,
      session.projectName,
      session.browser,
      session.status,
      session.pid || null,
      session.buildPid || null,
      session.debuggingPort || null,
      session.userDataDir || null,
      session.outputPath || null,
      session.buildOutputPath || null,
      session.serverUrl || null,
      session.startedAt,
      session.stoppedAt || null
    );

    this.eventBus.emit('session:created', { session });
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [];

    if (updates.status !== undefined) { sets.push('status = ?'); values.push(updates.status); }
    if (updates.pid !== undefined) { sets.push('pid = ?'); values.push(updates.pid); }
    if (updates.buildPid !== undefined) { sets.push('build_pid = ?'); values.push(updates.buildPid); }
    if (updates.debuggingPort !== undefined) { sets.push('debugging_port = ?'); values.push(updates.debuggingPort); }
    if (updates.userDataDir !== undefined) { sets.push('user_data_dir = ?'); values.push(updates.userDataDir); }
    if (updates.outputPath !== undefined) { sets.push('output_path = ?'); values.push(updates.outputPath); }
    if (updates.buildOutputPath !== undefined) { sets.push('build_output_path = ?'); values.push(updates.buildOutputPath); }
    if (updates.serverUrl !== undefined) { sets.push('server_url = ?'); values.push(updates.serverUrl); }
    if (updates.stoppedAt !== undefined) { sets.push('stopped_at = ?'); values.push(updates.stoppedAt); }

    if (sets.length === 0) return;

    values.push(id);
    this.db.prepare(`UPDATE sessions SET ${sets.join(', ')} WHERE id = ?`).run(...values);

    const session = this.getSessionById(id);
    if (session) {
      this.eventBus.emit('session:updated', { sessionId: id, updates, session });
    }
  }

  async removeSession(id: string): Promise<void> {
    this.db.prepare('DELETE FROM logs WHERE session_id = ?').run(id);
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    this.eventBus.emit('session:deleted', { sessionId: id });
  }

  getSessionById(id: string): Session | undefined {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    
    const session = this.rowToSession(row);
    session.logs = this.getSessionLogs(id);
    session.errors = session.logs.filter(l => l.level === 'error');
    return session;
  }

  getSessionsByProject(projectId: string): Session[] {
    const rows = this.db.prepare('SELECT * FROM sessions WHERE project_id = ? ORDER BY started_at DESC').all(projectId) as any[];
    return rows.map(row => this.rowToSession(row));
  }

  // Logs
  private getSessionLogs(sessionId: string): LogEntry[] {
    const rows = this.db.prepare(
      'SELECT * FROM logs WHERE session_id = ? ORDER BY timestamp ASC'
    ).all(sessionId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      level: row.level,
      source: row.source,
      message: row.message,
      details: row.details ? JSON.parse(row.details) : undefined,
    }));
  }

  async addLog(sessionId: string, entry: LogEntry): Promise<void> {
    this.db.prepare(`
      INSERT INTO logs (id, session_id, timestamp, level, source, message, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id,
      sessionId,
      entry.timestamp,
      entry.level,
      entry.source,
      entry.message,
      entry.details ? JSON.stringify(entry.details) : null
    );

    this.eventBus.emit('session:log', { sessionId, log: entry });
  }

  getStats(): { projects: number; activeSessions: number; totalSessions: number } {
    const projects = this.db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
    const totalSessions = this.db.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number };
    const activeSessions = this.db.prepare(
      "SELECT COUNT(*) as count FROM sessions WHERE status IN ('running', 'starting', 'building')"
    ).get() as { count: number };

    return {
      projects: projects.count,
      activeSessions: activeSessions.count,
      totalSessions: totalSessions.count,
    };
  }

  async clearAllSessions(): Promise<void> {
    this.db.prepare('DELETE FROM logs').run();
    this.db.prepare('DELETE FROM sessions').run();
  }

  // Cleanup
  close(): void {
    this.db.close();
  }
}

// Singleton instance
let dbInstance: HubDBSQLite | null = null;

export function getDBSQLite(configDir?: string): HubDBSQLite {
  if (!dbInstance) {
    dbInstance = new HubDBSQLite(configDir);
  }
  return dbInstance;
}

export function resetDBSQLite(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
