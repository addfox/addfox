import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync, mkdirSync } from 'fs';
import type { HubDatabase, HubSettings, Project, Session, LogEntry } from '../types.js';

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

const DEFAULT_DATA: HubDatabase = {
  version: 1,
  settings: DEFAULT_SETTINGS,
  projects: [],
  sessions: [],
};

export class HubDB {
  private db: Low<HubDatabase>;
  private configDir: string;

  constructor(configDir?: string) {
    this.configDir = configDir || join(homedir(), '.addfox-hub');
    this.ensureConfigDir();
    
    const file = join(this.configDir, 'db.json');
    const adapter = new JSONFile<HubDatabase>(file);
    this.db = new Low(adapter, DEFAULT_DATA);
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

  getConfigDir(): string {
    return this.configDir;
  }

  async init(): Promise<void> {
    await this.db.read();
    
    if (this.db.data.version < 1) {
      this.db.data = { ...DEFAULT_DATA };
    }
    
    this.db.data.settings = { ...DEFAULT_SETTINGS, ...this.db.data.settings };
    
    await this.db.write();
  }

  get settings(): HubSettings {
    return this.db.data.settings;
  }

  async updateSettings(updates: Partial<HubSettings>): Promise<void> {
    this.db.data.settings = { ...this.db.data.settings, ...updates };
    await this.db.write();
  }

  async addScanPath(path: string): Promise<void> {
    if (!this.db.data.settings.scan.paths.includes(path)) {
      this.db.data.settings.scan.paths.push(path);
      await this.db.write();
    }
  }

  async removeScanPath(path: string): Promise<void> {
    this.db.data.settings.scan.paths = this.db.data.settings.scan.paths.filter(p => p !== path);
    await this.db.write();
  }

  async addManualProject(path: string): Promise<void> {
    if (!this.db.data.settings.manualProjects.includes(path)) {
      this.db.data.settings.manualProjects.push(path);
      await this.db.write();
    }
  }

  async removeManualProject(path: string): Promise<void> {
    this.db.data.settings.manualProjects = this.db.data.settings.manualProjects.filter(p => p !== path);
    await this.db.write();
  }

  async addWorkspacePath(path: string): Promise<void> {
    if (!this.db.data.settings.workspace.paths.includes(path)) {
      this.db.data.settings.workspace.paths.push(path);
      await this.db.write();
    }
  }

  get projects(): Project[] {
    return this.db.data.projects;
  }

  async addProject(project: Project): Promise<void> {
    const existing = this.db.data.projects.findIndex(p => p.id === project.id);
    if (existing >= 0) {
      this.db.data.projects[existing] = project;
    } else {
      this.db.data.projects.push(project);
    }
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
    this.db.data.sessions = this.db.data.sessions.filter(s => s.projectId !== id);
    await this.db.write();
  }

  getProjectById(id: string): Project | undefined {
    return this.db.data.projects.find(p => p.id === id);
  }

  getProjectByPath(path: string): Project | undefined {
    return this.db.data.projects.find(p => p.path === path);
  }

  get sessions(): Session[] {
    return this.db.data.sessions;
  }

  get activeSessions(): Session[] {
    return this.db.data.sessions.filter(s => 
      s.status === 'running' || s.status === 'starting' || s.status === 'building'
    );
  }

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

  getSessionById(id: string): Session | undefined {
    return this.db.data.sessions.find(s => s.id === id);
  }

  getSessionsByProject(projectId: string): Session[] {
    return this.db.data.sessions.filter(s => s.projectId === projectId);
  }

  async addLog(sessionId: string, entry: LogEntry): Promise<void> {
    const session = this.getSessionById(sessionId);
    if (!session) return;

    session.logs.push(entry);
    
    if (session.logs.length > this.db.data.settings.maxLogHistory) {
      session.logs = session.logs.slice(-this.db.data.settings.maxLogHistory);
    }

    if (entry.level === 'error') {
      session.errors.push(entry);
    }

    await this.db.write();
  }

  getStats(): { projects: number; activeSessions: number; totalSessions: number } {
    return {
      projects: this.db.data.projects.length,
      activeSessions: this.activeSessions.length,
      totalSessions: this.db.data.sessions.length,
    };
  }

  async clearAllSessions(): Promise<void> {
    this.db.data.sessions = [];
    await this.db.write();
  }
}

let dbInstance: HubDB | null = null;

export function getDB(configDir?: string): HubDB {
  if (!dbInstance) {
    dbInstance = new HubDB(configDir);
  }
  return dbInstance;
}

export function resetDB(): void {
  dbInstance = null;
}
