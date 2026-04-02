import { spawn, type IPty } from 'node-pty';
import { WebSocket } from 'ws';
import { platform } from 'os';
import { resolve } from 'path';

const IS_WINDOWS = platform() === 'win32';

export interface TerminalSession {
  id: string;
  pty: IPty;
  ws: WebSocket;
  cwd: string;
  shell: string;
  createdAt: Date;
}

export class TerminalService {
  private sessions = new Map<string, TerminalSession>();
  private counter = 0;

  /**
   * 获取默认 shell
   */
  private getDefaultShell(): string {
    const isWindows = platform() === 'win32';
    if (isWindows) {
      // Windows: 优先使用 PowerShell，然后是 CMD
      return process.env.PSModulePath ? 'powershell.exe' : 'cmd.exe';
    }
    // macOS/Linux: 使用用户默认 shell
    return process.env.SHELL || '/bin/bash';
  }

  /**
   * 创建新的终端会话
   */
  createSession(ws: WebSocket, cwd?: string): TerminalSession {
    const id = `term-${++this.counter}-${Date.now()}`;
    const shell = this.getDefaultShell();
    const workingDir = cwd ? resolve(cwd) : process.cwd();

    // 创建 PTY 进程
    const pty = spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: workingDir,
      env: process.env as { [key: string]: string },
    });

    const session: TerminalSession = {
      id,
      pty,
      ws,
      cwd: workingDir,
      shell,
      createdAt: new Date(),
    };

    this.sessions.set(id, session);

    // 设置 PTY 输出处理
    pty.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'output', data }));
      }
    });

    pty.onExit(({ exitCode, signal }) => {
      console.log(`[Terminal] Session ${id} exited with code ${exitCode}, signal ${signal}`);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ 
          type: 'exit', 
          exitCode, 
          signal 
        }));
        ws.close();
      }
      this.sessions.delete(id);
    });

    return session;
  }

  /**
   * 处理客户端输入
   */
  handleInput(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pty.write(data);
    }
  }

  /**
   * 调整终端大小
   */
  resize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pty.resize(cols, rows);
    }
  }

  /**
   * 关闭终端会话
   */
  closeSession(sessionId: string, signal?: NodeJS.Signals): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        if (IS_WINDOWS) {
          // Windows 不支持 POSIX 信号，使用 kill() 不带参数或发送 exit
          session.pty.kill();
        } else {
          session.pty.kill(signal);
        }
      } catch (err) {
        console.warn(`[Terminal] Failed to kill session ${sessionId}:`, err);
      }
      this.sessions.delete(sessionId);
    }
  }

  /**
   * 获取所有活跃会话
   */
  getActiveSessions(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * 获取会话数量
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * 处理 WebSocket 消息
   */
  handleMessage(sessionId: string, message: string): void {
    try {
      const msg = JSON.parse(message);
      const session = this.sessions.get(sessionId);
      
      if (!session) {
        console.warn(`[Terminal] Session ${sessionId} not found`);
        return;
      }

      switch (msg.type) {
        case 'input':
          // 终端输入
          if (typeof msg.data === 'string') {
            session.pty.write(msg.data);
          }
          break;

        case 'resize':
          // 调整大小
          if (typeof msg.cols === 'number' && typeof msg.rows === 'number') {
            session.pty.resize(msg.cols, msg.rows);
            console.log(`[Terminal] Session ${sessionId} resized to ${msg.cols}x${msg.rows}`);
          }
          break;

        case 'ping':
          // 心跳响应
          if (session.ws.readyState === WebSocket.OPEN) {
            session.ws.send(JSON.stringify({ type: 'pong' }));
          }
          break;

        default:
          console.warn(`[Terminal] Unknown message type: ${msg.type}`);
      }
    } catch (err) {
      console.error('[Terminal] Failed to handle message:', err);
    }
  }

  /**
   * 清理所有会话
   */
  dispose(): void {
    for (const [id, session] of this.sessions) {
      try {
        if (IS_WINDOWS) {
          session.pty.kill();
        } else {
          session.pty.kill('SIGTERM');
        }
      } catch (err) {
        console.warn(`[Terminal] Failed to kill session ${id}:`, err);
      }
    }
    this.sessions.clear();
  }
}

// 单例实例
let terminalService: TerminalService | null = null;

export function getTerminalService(): TerminalService {
  if (!terminalService) {
    terminalService = new TerminalService();
  }
  return terminalService;
}

export function resetTerminalService(): void {
  if (terminalService) {
    terminalService.dispose();
    terminalService = null;
  }
}
