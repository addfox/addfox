import { EventEmitter } from 'events';
import type { BrowserType, Session } from '../types.js';

// CDP Types
interface CDPVersion {
  Browser: string;
  'Protocol-Version': string;
  'User-Agent': string;
  'V8-Version': string;
  'WebKit-Version': string;
  webSocketDebuggerUrl?: string;
}

interface CDPTarget {
  id: string;
  title: string;
  type: string;
  url: string;
  webSocketDebuggerUrl?: string;
  thumbnailUrl?: string;
  faviconUrl?: string;
}

interface CDPConnection {
  id: string;
  ws: WebSocket;
  sessionId?: string;
  messageId: number;
  pendingRequests: Map<number, { resolve: (value: any) => void; reject: (reason?: any) => void }>;
  eventHandlers: Map<string, Set<(params: any) => void>>;
}

export interface ExtensionInfo {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  icon?: string;
}

export interface RuntimeEvaluateResult {
  result: {
    type: string;
    value?: any;
    description?: string;
    objectId?: string;
  };
  exceptionDetails?: {
    text: string;
    lineNumber: number;
    columnNumber: number;
  };
}

/**
 * Chrome DevTools Protocol Manager
 * Manages connections to browser debugging endpoints
 */
export class CDPManager extends EventEmitter {
  private connections = new Map<string, CDPConnection>();
  private sessions = new Map<string, { debuggingPort: number; browser: BrowserType }>();

  /**
   * Register a session for CDP management
   */
  registerSession(sessionId: string, debuggingPort: number, browser: BrowserType): void {
    this.sessions.set(sessionId, { debuggingPort, browser });
  }

  /**
   * Unregister a session
   */
  unregisterSession(sessionId: string): void {
    this.disconnect(sessionId);
    this.sessions.delete(sessionId);
  }

  /**
   * Get the CDP version endpoint
   */
  async getVersion(debuggingPort: number): Promise<CDPVersion | null> {
    try {
      const response = await fetch(`http://localhost:${debuggingPort}/json/version`);
      return await response.json() as CDPVersion;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get list of available targets
   */
  async getTargets(debuggingPort: number): Promise<CDPTarget[]> {
    try {
      const response = await fetch(`http://localhost:${debuggingPort}/json/list`);
      return await response.json() as CDPTarget[];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get extension info from the browser
   */
  async getExtensions(sessionId: string): Promise<ExtensionInfo[]> {
    try {
      // Find the background service worker or extension page
      const targets = await this.getTargetsForSession(sessionId);
      const extensionTarget = targets.find(t => 
        t.type === 'service_worker' || 
        t.url.startsWith('chrome-extension://')
      );

      if (!extensionTarget) {
        return [];
      }

      // Connect to the target and query extensions
      // This is a simplified version - real implementation would need more complex logic
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Connect to a session's debugging endpoint
   */
  async connect(sessionId: string, targetId?: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not registered`);
    }

    // Disconnect existing connection
    this.disconnect(sessionId);

    try {
      const targets = await this.getTargets(session.debuggingPort);
      
      let target: CDPTarget | undefined;
      
      if (targetId) {
        target = targets.find(t => t.id === targetId);
      } else {
        // Find the best target to connect to
        // Priority: background service worker > extension page > first available
        target = targets.find(t => t.type === 'service_worker') ||
                 targets.find(t => t.url.startsWith('chrome-extension://')) ||
                 targets[0];
      }

      if (!target?.webSocketDebuggerUrl) {
        throw new Error('No suitable debugging target found');
      }

      // Connect via WebSocket
      const ws = new WebSocket(target.webSocketDebuggerUrl);
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('CDP connection timeout'));
        }, 10000);

        ws.onopen = () => {
          clearTimeout(timeout);
          
          const connection: CDPConnection = {
            id: sessionId,
            ws,
            messageId: 0,
            pendingRequests: new Map(),
            eventHandlers: new Map(),
          };

          this.connections.set(sessionId, connection);
          this.setupConnectionHandlers(connection);
          
          this.emit('connected', sessionId);
          resolve(true);
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });
    } catch (error) {
      this.emit('error', sessionId, error);
      return false;
    }
  }

  /**
   * Disconnect from a session
   */
  disconnect(sessionId: string): void {
    const connection = this.connections.get(sessionId);
    if (connection) {
      connection.ws.close();
      this.connections.delete(sessionId);
      this.emit('disconnected', sessionId);
    }
  }

  /**
   * Send a CDP command
   */
  async sendCommand<T = any>(
    sessionId: string,
    method: string,
    params?: Record<string, any>
  ): Promise<T> {
    const connection = this.connections.get(sessionId);
    if (!connection) {
      throw new Error(`Not connected to session ${sessionId}`);
    }

    const id = ++connection.messageId;
    
    return new Promise((resolve, reject) => {
      connection.pendingRequests.set(id, { resolve, reject });
      
      const message = JSON.stringify({ id, method, params });
      connection.ws.send(message);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (connection.pendingRequests.has(id)) {
          connection.pendingRequests.delete(id);
          reject(new Error(`Command ${method} timeout`));
        }
      }, 30000);
    });
  }

  /**
   * Subscribe to CDP events
   */
  onEvent(
    sessionId: string,
    event: string,
    handler: (params: any) => void
  ): () => void {
    const connection = this.connections.get(sessionId);
    if (!connection) {
      throw new Error(`Not connected to session ${sessionId}`);
    }

    if (!connection.eventHandlers.has(event)) {
      connection.eventHandlers.set(event, new Set());
    }

    connection.eventHandlers.get(event)!.add(handler);

    return () => {
      connection.eventHandlers.get(event)?.delete(handler);
    };
  }

  /**
   * Evaluate JavaScript in the target context
   */
  async evaluate(
    sessionId: string,
    expression: string,
    contextId?: number
  ): Promise<RuntimeEvaluateResult> {
    const params: any = { expression };
    if (contextId) {
      params.contextId = contextId;
    }

    return this.sendCommand(sessionId, 'Runtime.evaluate', params);
  }

  /**
   * Reload the target page
   */
  async reload(sessionId: string, ignoreCache: boolean = false): Promise<void> {
    await this.sendCommand(sessionId, 'Page.reload', { ignoreCache });
  }

  /**
   * Navigate to a URL
   */
  async navigate(sessionId: string, url: string): Promise<void> {
    await this.sendCommand(sessionId, 'Page.navigate', { url });
  }

  /**
   * Take a screenshot
   */
  async takeScreenshot(sessionId: string): Promise<string | null> {
    try {
      const result = await this.sendCommand<{ data: string }>(
        sessionId,
        'Page.captureScreenshot'
      );
      return result.data;
    } catch {
      return null;
    }
  }

  /**
   * Get console logs
   */
  async getConsoleLogs(sessionId: string): Promise<any[]> {
    // Enable Runtime and Console domains first
    await this.sendCommand(sessionId, 'Runtime.enable');
    await this.sendCommand(sessionId, 'Console.enable');

    // Return empty array - logs will come through events
    return [];
  }

  /**
   * Check if connected to a session
   */
  isConnected(sessionId: string): boolean {
    const connection = this.connections.get(sessionId);
    return connection?.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection status for all sessions
   */
  getConnectionStatus(): { sessionId: string; connected: boolean }[] {
    return Array.from(this.sessions.keys()).map(sessionId => ({
      sessionId,
      connected: this.isConnected(sessionId),
    }));
  }

  private async getTargetsForSession(sessionId: string): Promise<CDPTarget[]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return this.getTargets(session.debuggingPort);
  }

  private setupConnectionHandlers(connection: CDPConnection): void {
    connection.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data.toString());

        // Handle responses to commands
        if (message.id !== undefined) {
          const pending = connection.pendingRequests.get(message.id);
          if (pending) {
            connection.pendingRequests.delete(message.id);
            if (message.error) {
              pending.reject(new Error(message.error.message));
            } else {
              pending.resolve(message.result);
            }
          }
        }

        // Handle events
        if (message.method) {
          const handlers = connection.eventHandlers.get(message.method);
          if (handlers) {
            for (const handler of handlers) {
              try {
                handler(message.params);
              } catch {
                // Ignore handler errors
              }
            }
          }
          this.emit('event', connection.id, message.method, message.params);
        }
      } catch {
        // Ignore parse errors
      }
    };

    connection.ws.onclose = () => {
      this.connections.delete(connection.id);
      this.emit('disconnected', connection.id);
    };

    connection.ws.onerror = (error) => {
      this.emit('error', connection.id, error);
    };
  }
}

// Singleton instance
let cdpManagerInstance: CDPManager | null = null;

export function getCDPManager(): CDPManager {
  if (!cdpManagerInstance) {
    cdpManagerInstance = new CDPManager();
  }
  return cdpManagerInstance;
}

export function resetCDPManager(): void {
  cdpManagerInstance = null;
}
