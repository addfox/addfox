// ============================================
// Process Manager - Robust process lifecycle management
// ============================================

import { spawn, ChildProcess, SpawnOptions } from 'child_process';
import { EventEmitter } from 'events';
import { createWriteStream, WriteStream, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { LogEntry, ProcessStatus } from '../types.js';

export interface ManagedProcess {
  id: string; // sessionId
  pid: number;
  process: ChildProcess;
  status: ProcessStatus;
  startTime: Date;
  restartCount: number;
  maxRestarts: number;
  outputPath: string;
  logFilePath: string;
  logs: LogEntry[]; // In-memory recent logs (circular buffer)
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  logStream?: WriteStream;
  watchers: Set<(entry: LogEntry) => void>;
  statusWatchers: Set<(status: ProcessStatus, oldStatus: ProcessStatus) => void>;
  crashWatchers: Set<(error: Error) => void>;
  progressWatchers: Set<(progress: number, message: string) => void>;
  lastRestartAt?: Date;
  restartDelays: number[]; // Exponential backoff delays in ms
  currentRestartDelayIndex: number;
  gracefulShutdownTimeout: number;
  isShuttingDown: boolean;
  buildStatus: 'building' | 'ready' | 'error' | null;
  serverUrl?: string;
}

export interface ProcessStartOptions {
  command: string;
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  outputPath: string;
  maxRestarts?: number;
  maxLogBufferSize?: number;
  gracefulShutdownTimeout?: number;
  restartDelayBase?: number; // Base delay for exponential backoff (ms)
  restartDelayMax?: number; // Max delay for exponential backoff (ms)
}

export interface LogQueryOptions {
  limit?: number;
  offset?: number;
  level?: 'debug' | 'info' | 'warn' | 'error';
  startTime?: Date;
  endTime?: Date;
  source?: string;
  search?: string;
}

export class ProcessManager extends EventEmitter {
  private processes = new Map<string, ManagedProcess>();
  private configDir: string;
  private defaultMaxRestarts = 3;
  private defaultMaxLogBufferSize = 1000;
  private defaultGracefulShutdownTimeout = 10000; // 10 seconds
  private defaultRestartDelayBase = 1000; // 1 second
  private defaultRestartDelayMax = 30000; // 30 seconds

  constructor(configDir: string) {
    super();
    this.configDir = configDir;
    this.ensureLogDir();
  }

  private ensureLogDir(): void {
    const logDir = join(this.configDir, 'logs', 'sessions');
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
  }

  private getSessionLogDir(sessionId: string): string {
    return join(this.configDir, 'logs', 'sessions', sessionId);
  }

  private ensureSessionLogDir(sessionId: string): void {
    const dir = this.getSessionLogDir(sessionId);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Start a new managed process
   */
  async start(sessionId: string, options: ProcessStartOptions): Promise<ManagedProcess> {
    // Stop existing process for this session if any
    if (this.processes.has(sessionId)) {
      await this.stop(sessionId);
    }

    this.ensureSessionLogDir(sessionId);

    const logFilePath = join(this.getSessionLogDir(sessionId), 'output.log');
    const logStream = createWriteStream(logFilePath, { flags: 'a' });

    const restartDelays = this.calculateBackoffDelays(
      options.restartDelayBase ?? this.defaultRestartDelayBase,
      options.restartDelayMax ?? this.defaultRestartDelayMax,
      options.maxRestarts ?? this.defaultMaxRestarts
    );

    const managedProcess: ManagedProcess = {
      id: sessionId,
      pid: 0,
      process: null as unknown as ChildProcess,
      status: 'starting',
      startTime: new Date(),
      restartCount: 0,
      maxRestarts: options.maxRestarts ?? this.defaultMaxRestarts,
      outputPath: options.outputPath,
      logFilePath,
      logs: [],
      command: options.command,
      args: options.args,
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      logStream,
      watchers: new Set(),
      statusWatchers: new Set(),
      crashWatchers: new Set(),
      progressWatchers: new Set(),
      restartDelays,
      currentRestartDelayIndex: 0,
      gracefulShutdownTimeout: options.gracefulShutdownTimeout ?? this.defaultGracefulShutdownTimeout,
      isShuttingDown: false,
      buildStatus: 'building',
    };

    // Spawn the process
    const proc = spawn(options.command, options.args, {
      cwd: options.cwd,
      env: managedProcess.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    managedProcess.process = proc;
    managedProcess.pid = proc.pid!;

    this.processes.set(sessionId, managedProcess);

    // Set up stream handlers
    this.setupStreamHandlers(sessionId, proc);

    // Start watching process health
    this.watchProcess(sessionId);

    // Log process start
    this.addLogEntry(sessionId, {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      level: 'info',
      source: 'system',
      message: `Process started: ${options.command} ${options.args.join(' ')}`,
      metadata: {
        processId: managedProcess.pid,
        tag: 'process-manager',
      },
    });

    return managedProcess;
  }

  /**
   * Calculate exponential backoff delays
   */
  private calculateBackoffDelays(base: number, max: number, count: number): number[] {
    const delays: number[] = [];
    for (let i = 0; i < count; i++) {
      // Exponential backoff with jitter: base * 2^i + random(0, base)
      const delay = Math.min(base * Math.pow(2, i) + Math.random() * base, max);
      delays.push(Math.round(delay));
    }
    return delays;
  }

  /**
   * Set up stdout/stderr stream handlers
   */
  private setupStreamHandlers(sessionId: string, proc: ChildProcess): void {
    const managed = this.processes.get(sessionId);
    if (!managed) return;

    proc.stdout?.on('data', (data: Buffer) => {
      this.collectLogs(sessionId, 'stdout', data);
    });

    proc.stderr?.on('data', (data: Buffer) => {
      this.collectLogs(sessionId, 'stderr', data);
    });

    proc.on('error', (error) => {
      this.handleCrash(sessionId, error);
    });

    proc.on('exit', (code, signal) => {
      this.handleExit(sessionId, code, signal);
    });
  }

  /**
   * Collect logs from stdout/stderr
   */
  private collectLogs(sessionId: string, stream: 'stdout' | 'stderr', data: Buffer): void {
    const managed = this.processes.get(sessionId);
    if (!managed) return;

    const lines = data.toString().split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Write to log file
      if (managed.logStream) {
        managed.logStream.write(`[${stream}] ${trimmedLine}\n`);
      }

      // Create log entry
      const entry: LogEntry = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        level: stream === 'stderr' ? 'error' : 'info',
        source: stream === 'stderr' ? 'stderr' : 'stdout',
        message: trimmedLine,
        metadata: {
          processId: managed.pid,
        },
      };

      // Add to memory buffer (circular)
      this.addToLogBuffer(managed, entry);

      // Notify watchers
      for (const watcher of managed.watchers) {
        try {
          watcher(entry);
        } catch {
          // Ignore watcher errors
        }
      }

      // Emit global event
      this.emit('log', sessionId, entry);
    }
  }

  /**
   * Add log entry to memory buffer with size limit
   */
  private addToLogBuffer(managed: ManagedProcess, entry: LogEntry): void {
    managed.logs.push(entry);

    // Remove oldest entries if buffer is full
    const maxSize = this.defaultMaxLogBufferSize;
    if (managed.logs.length > maxSize) {
      managed.logs = managed.logs.slice(-maxSize);
    }
  }

  /**
   * Add a structured log entry directly
   */
  addLogEntry(sessionId: string, entry: LogEntry): void {
    const managed = this.processes.get(sessionId);
    if (!managed) return;

    // Write to log file with structured format
    if (managed.logStream) {
      const logLine = JSON.stringify({
        timestamp: entry.timestamp,
        level: entry.level,
        source: entry.source,
        message: entry.message,
        details: entry.details,
        metadata: entry.metadata,
      });
      managed.logStream.write(`${logLine}\n`);
    }

    this.addToLogBuffer(managed, entry);

    // Notify watchers
    for (const watcher of managed.watchers) {
      try {
        watcher(entry);
      } catch {
        // Ignore watcher errors
      }
    }

    this.emit('log', sessionId, entry);
  }

  /**
   * Watch process health
   */
  private watchProcess(sessionId: string): void {
    const managed = this.processes.get(sessionId);
    if (!managed) return;

    // Check if process is still running periodically
    const checkInterval = setInterval(() => {
      if (!this.processes.has(sessionId)) {
        clearInterval(checkInterval);
        return;
      }

      const currentManaged = this.processes.get(sessionId);
      if (!currentManaged || currentManaged.isShuttingDown) {
        clearInterval(checkInterval);
        return;
      }

      // Check if process has exited (killed externally)
      if (currentManaged.process.exitCode !== null || currentManaged.process.signalCode !== null) {
        clearInterval(checkInterval);
        if (!currentManaged.isShuttingDown) {
          this.handleCrash(sessionId, new Error('Process exited unexpectedly'));
        }
      }
    }, 2000);
  }

  /**
   * Handle process crash
   */
  private handleCrash(sessionId: string, error: Error): void {
    const managed = this.processes.get(sessionId);
    if (!managed || managed.isShuttingDown) return;

    this.setStatus(sessionId, 'crashed');

    // Notify crash watchers
    for (const watcher of managed.crashWatchers) {
      try {
        watcher(error);
      } catch {
        // Ignore watcher errors
      }
    }

    this.emit('crash', sessionId, error);

    // Attempt restart if under max restarts
    if (managed.restartCount < managed.maxRestarts) {
      this.scheduleRestart(sessionId);
    } else {
      this.addLogEntry(sessionId, {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        level: 'error',
        source: 'system',
        message: `Process crashed and reached max restarts (${managed.maxRestarts}). Giving up.`,
        details: {
          stack: error.stack,
        },
        metadata: {
          processId: managed.pid,
          tag: 'process-manager',
        },
      });
      this.setStatus(sessionId, 'error');
    }
  }

  /**
   * Handle process exit
   */
  private handleExit(sessionId: string, code: number | null, signal: string | null): void {
    const managed = this.processes.get(sessionId);
    if (!managed || managed.isShuttingDown) return;

    if (code !== 0 && code !== null) {
      const error = new Error(`Process exited with code ${code}`);
      this.handleCrash(sessionId, error);
    } else if (signal) {
      // Process was killed by signal, not a crash
      this.setStatus(sessionId, 'stopped');
    }
  }

  /**
   * Schedule a restart with exponential backoff
   */
  private scheduleRestart(sessionId: string): void {
    const managed = this.processes.get(sessionId);
    if (!managed) return;

    managed.restartCount++;
    const delay = managed.restartDelays[managed.currentRestartDelayIndex] ?? managed.restartDelays[managed.restartDelays.length - 1];

    this.addLogEntry(sessionId, {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      level: 'warn',
      source: 'system',
      message: `Process crashed. Restarting in ${delay}ms (attempt ${managed.restartCount}/${managed.maxRestarts})...`,
      metadata: {
        tag: 'process-manager',
      },
    });

    setTimeout(() => {
      this.restart(sessionId).catch(() => {
        // Restart failed, will be handled by error handler
      });
    }, delay);

    // Increase delay for next time (capped at max)
    if (managed.currentRestartDelayIndex < managed.restartDelays.length - 1) {
      managed.currentRestartDelayIndex++;
    }
  }

  /**
   * Stop a managed process gracefully
   */
  async stop(sessionId: string): Promise<void> {
    const managed = this.processes.get(sessionId);
    if (!managed) return;

    managed.isShuttingDown = true;
    this.setStatus(sessionId, 'stopping');

    this.addLogEntry(sessionId, {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      level: 'info',
      source: 'system',
      message: 'Stopping process...',
      metadata: {
        processId: managed.pid,
        tag: 'process-manager',
      },
    });

    // Close log stream
    if (managed.logStream) {
      managed.logStream.end();
    }

    // Try graceful shutdown first
    if (managed.process && !managed.process.killed) {
      managed.process.kill('SIGTERM');

      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          resolve();
        }, managed.gracefulShutdownTimeout);

        managed.process.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      // Force kill if still running
      if (!managed.process.killed) {
        try {
          managed.process.kill('SIGKILL');
        } catch {
          // Process might have already exited
        }
      }
    }

    this.processes.delete(sessionId);
  }

  /**
   * Restart a managed process
   */
  async restart(sessionId: string): Promise<void> {
    const managed = this.processes.get(sessionId);
    if (!managed) {
      throw new Error(`Process ${sessionId} not found`);
    }

    const { command, args, cwd, outputPath, maxRestarts, env } = managed;

    // Stop current process
    await this.stop(sessionId);

    // Start new process
    await this.start(sessionId, {
      command,
      args,
      cwd,
      outputPath,
      maxRestarts,
      env,
    });

    const newManaged = this.processes.get(sessionId);
    if (newManaged) {
      newManaged.restartCount = managed.restartCount;
    }

    this.addLogEntry(sessionId, {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      level: 'info',
      source: 'system',
      message: 'Process restarted successfully',
      metadata: {
        processId: newManaged?.pid,
        tag: 'process-manager',
      },
    });
  }

  /**
   * Get process status
   */
  getStatus(sessionId: string): ProcessStatus | null {
    const managed = this.processes.get(sessionId);
    return managed?.status ?? null;
  }

  /**
   * Set process status and notify watchers
   */
  setStatus(sessionId: string, status: ProcessStatus): void {
    const managed = this.processes.get(sessionId);
    if (!managed || managed.status === status) return;

    const oldStatus = managed.status;
    managed.status = status;

    // Notify status watchers
    for (const watcher of managed.statusWatchers) {
      try {
        watcher(status, oldStatus);
      } catch {
        // Ignore watcher errors
      }
    }

    this.emit('status-change', sessionId, status, oldStatus);
  }

  /**
   * Set build status
   */
  setBuildStatus(sessionId: string, status: 'building' | 'ready' | 'error'): void {
    const managed = this.processes.get(sessionId);
    if (!managed) return;

    managed.buildStatus = status;

    if (status === 'ready') {
      // Reset restart count on successful build
      managed.restartCount = 0;
      managed.currentRestartDelayIndex = 0;
    }
  }

  /**
   * Get build status
   */
  getBuildStatus(sessionId: string): 'building' | 'ready' | 'error' | null {
    const managed = this.processes.get(sessionId);
    return managed?.buildStatus ?? null;
  }

  /**
   * Set server URL
   */
  setServerUrl(sessionId: string, url: string): void {
    const managed = this.processes.get(sessionId);
    if (managed) {
      managed.serverUrl = url;
    }
  }

  /**
   * Get server URL
   */
  getServerUrl(sessionId: string): string | undefined {
    const managed = this.processes.get(sessionId);
    return managed?.serverUrl;
  }

  /**
   * Get logs from memory buffer
   */
  getLogs(sessionId: string, options: LogQueryOptions = {}): LogEntry[] {
    const managed = this.processes.get(sessionId);
    if (!managed) return [];

    let logs = [...managed.logs];

    // Apply filters
    if (options.level) {
      logs = logs.filter((l) => l.level === options.level);
    }

    if (options.source) {
      logs = logs.filter((l) => l.source === options.source);
    }

    if (options.startTime) {
      const start = new Date(options.startTime).getTime();
      logs = logs.filter((l) => new Date(l.timestamp).getTime() >= start);
    }

    if (options.endTime) {
      const end = new Date(options.endTime).getTime();
      logs = logs.filter((l) => new Date(l.timestamp).getTime() <= end);
    }

    if (options.search) {
      const search = options.search.toLowerCase();
      logs = logs.filter((l) => l.message.toLowerCase().includes(search));
    }

    // Sort by timestamp descending for pagination
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    const offset = options.offset ?? 0;
    const limit = options.limit ?? logs.length;

    return logs.slice(offset, offset + limit);
  }

  /**
   * Get recent logs (convenience method)
   */
  getRecentLogs(sessionId: string, lines: number = 100): LogEntry[] {
    return this.getLogs(sessionId, { limit: lines });
  }

  /**
   * Register log watcher
   */
  onLog(sessionId: string, callback: (entry: LogEntry) => void): () => void {
    const managed = this.processes.get(sessionId);
    if (!managed) {
      return () => {};
    }

    managed.watchers.add(callback);
    return () => {
      managed.watchers.delete(callback);
    };
  }

  /**
   * Register status change watcher
   */
  onStatusChange(
    sessionId: string,
    callback: (status: ProcessStatus, oldStatus: ProcessStatus) => void
  ): () => void {
    const managed = this.processes.get(sessionId);
    if (!managed) {
      return () => {};
    }

    managed.statusWatchers.add(callback);
    return () => {
      managed.statusWatchers.delete(callback);
    };
  }

  /**
   * Register crash watcher
   */
  onCrash(sessionId: string, callback: (error: Error) => void): () => void {
    const managed = this.processes.get(sessionId);
    if (!managed) {
      return () => {};
    }

    managed.crashWatchers.add(callback);
    return () => {
      managed.crashWatchers.delete(callback);
    };
  }

  /**
   * Register progress watcher
   */
  onProgress(sessionId: string, callback: (progress: number, message: string) => void): () => void {
    const managed = this.processes.get(sessionId);
    if (!managed) {
      return () => {};
    }

    managed.progressWatchers.add(callback);
    return () => {
      managed.progressWatchers.delete(callback);
    };
  }

  /**
   * Emit progress update
   */
  emitProgress(sessionId: string, progress: number, message: string): void {
    const managed = this.processes.get(sessionId);
    if (!managed) return;

    for (const watcher of managed.progressWatchers) {
      try {
        watcher(progress, message);
      } catch {
        // Ignore watcher errors
      }
    }

    this.emit('progress', sessionId, progress, message);
  }

  /**
   * Get managed process
   */
  getProcess(sessionId: string): ManagedProcess | undefined {
    return this.processes.get(sessionId);
  }

  /**
   * Get all active process IDs
   */
  getActiveProcessIds(): string[] {
    return Array.from(this.processes.keys()).filter((id) => {
      const managed = this.processes.get(id);
      return managed && !managed.isShuttingDown;
    });
  }

  /**
   * Stop all processes
   */
  async stopAll(): Promise<void> {
    const promises = Array.from(this.processes.keys()).map((id) => this.stop(id));
    await Promise.all(promises);
  }

  /**
   * Get process statistics
   */
  getStats(): {
    total: number;
    running: number;
    starting: number;
    crashed: number;
    stopping: number;
  } {
    const stats = {
      total: this.processes.size,
      running: 0,
      starting: 0,
      crashed: 0,
      stopping: 0,
    };

    for (const managed of this.processes.values()) {
      if (managed.isShuttingDown) {
        stats.stopping++;
      } else if (managed.status === 'running') {
        stats.running++;
      } else if (managed.status === 'starting') {
        stats.starting++;
      } else if (managed.status === 'crashed' || managed.status === 'error') {
        stats.crashed++;
      }
    }

    return stats;
  }
}

// Singleton instance
let processManagerInstance: ProcessManager | null = null;

export function getProcessManager(configDir: string): ProcessManager {
  if (!processManagerInstance) {
    processManagerInstance = new ProcessManager(configDir);
  }
  return processManagerInstance;
}

export function resetProcessManager(): void {
  processManagerInstance = null;
}
