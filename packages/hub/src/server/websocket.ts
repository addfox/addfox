import type { WebSocket } from 'ws';
import { getEventBus, type HubEventType, type HubEventMap } from '../core/event-bus.js';
import { getDB } from '../core/db.js';
import type { LogEntry } from '../types.js';

// Client subscription types
type SubscriptionType = 'all' | 'sessions' | 'projects' | 'stats' | `session:${string}`;

interface WSClient {
  socket: WebSocket;
  subscriptions: Set<SubscriptionType>;
  id: string;
}

interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'get_logs' | 'get_session';
  payload?: any;
}

class WebSocketManager {
  private clients = new Map<string, WSClient>();
  private eventBus = getEventBus();
  private clientIdCounter = 0;

  constructor() {
    this.setupEventListeners();
  }

  private generateClientId(): string {
    return `client_${++this.clientIdCounter}_${Date.now().toString(36)}`;
  }

  private setupEventListeners(): void {
    // Session events
    this.eventBus.on('session:created', ({ session }) => {
      this.broadcast('sessions', {
        type: 'session:created',
        data: { session },
      });
      this.broadcast('stats', {
        type: 'stats:updated',
        data: { stats: getDB().getStats() },
      });
    });

    this.eventBus.on('session:updated', ({ sessionId, updates, session }) => {
      this.broadcast('sessions', {
        type: 'session:updated',
        data: { sessionId, updates, session },
      });
      // Also broadcast to specific session subscribers
      this.broadcast(`session:${sessionId}`, {
        type: 'session:updated',
        data: { sessionId, updates, session },
      });
      if (updates.status) {
        this.broadcast('stats', {
          type: 'stats:updated',
          data: { stats: getDB().getStats() },
        });
      }
    });

    this.eventBus.on('session:deleted', ({ sessionId }) => {
      this.broadcast('sessions', {
        type: 'session:deleted',
        data: { sessionId },
      });
      this.broadcast('stats', {
        type: 'stats:updated',
        data: { stats: getDB().getStats() },
      });
    });

    this.eventBus.on('session:log', ({ sessionId, log }) => {
      this.broadcast(`session:${sessionId}`, {
        type: 'session:log',
        data: { sessionId, log },
      });
    });

    // Project events
    this.eventBus.on('project:created', ({ project }) => {
      this.broadcast('projects', {
        type: 'project:created',
        data: { project },
      });
      this.broadcast('stats', {
        type: 'stats:updated',
        data: { stats: getDB().getStats() },
      });
    });

    this.eventBus.on('project:updated', ({ projectId, updates, project }) => {
      this.broadcast('projects', {
        type: 'project:updated',
        data: { projectId, updates, project },
      });
    });

    this.eventBus.on('project:deleted', ({ projectId }) => {
      this.broadcast('projects', {
        type: 'project:deleted',
        data: { projectId },
      });
      this.broadcast('stats', {
        type: 'stats:updated',
        data: { stats: getDB().getStats() },
      });
    });
  }

  handleConnection(socket: WebSocket): void {
    const clientId = this.generateClientId();
    const client: WSClient = {
      socket,
      subscriptions: new Set(),
      id: clientId,
    };

    this.clients.set(clientId, client);
    console.log(`WebSocket client connected: ${clientId}`);

    // Send initial data
    this.sendInitialData(client);

    // Handle messages
    socket.on('message', (rawMessage: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const message: WSMessage = JSON.parse(rawMessage.toString());
        this.handleMessage(client, message);
      } catch (err) {
        this.sendError(client, 'Invalid message format');
      }
    });

    // Handle close
    socket.on('close', () => {
      this.clients.delete(clientId);
      console.log(`WebSocket client disconnected: ${clientId}`);
    });

    // Handle errors
    socket.on('error', (err: Error) => {
      console.error(`WebSocket error for client ${clientId}: ${err.message}`);
      this.clients.delete(clientId);
    });
  }

  private sendInitialData(client: WSClient): void {
    const db = getDB();
    
    this.send(client, {
      type: 'init',
      data: {
        stats: db.getStats(),
        sessions: db.sessions,
        projects: db.projects.slice(0, 50), // Limit initial project load
      },
    });
  }

  private handleMessage(client: WSClient, message: WSMessage): void {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(client, message.payload);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(client, message.payload);
        break;
      case 'ping':
        this.send(client, { type: 'pong', timestamp: Date.now() });
        break;
      case 'get_logs':
        this.handleGetLogs(client, message.payload);
        break;
      case 'get_session':
        this.handleGetSession(client, message.payload);
        break;
      default:
        this.sendError(client, `Unknown message type: ${message.type}`);
    }
  }

  private handleSubscribe(client: WSClient, subscription: SubscriptionType | SubscriptionType[]): void {
    const subs = Array.isArray(subscription) ? subscription : [subscription];
    
    for (const sub of subs) {
      client.subscriptions.add(sub);
    }

    this.send(client, {
      type: 'subscribed',
      data: { subscriptions: Array.from(client.subscriptions) },
    });
  }

  private handleUnsubscribe(client: WSClient, subscription: SubscriptionType | SubscriptionType[]): void {
    const subs = Array.isArray(subscription) ? subscription : [subscription];
    
    for (const sub of subs) {
      client.subscriptions.delete(sub);
    }

    this.send(client, {
      type: 'unsubscribed',
      data: { subscriptions: Array.from(client.subscriptions) },
    });
  }

  private handleGetLogs(client: WSClient, payload: { sessionId: string; limit?: number; offset?: number }): void {
    if (!payload?.sessionId) {
      this.sendError(client, 'sessionId is required');
      return;
    }

    const db = getDB();
    const session = db.getSessionById(payload.sessionId);
    
    if (!session) {
      this.sendError(client, 'Session not found');
      return;
    }

    const { limit = 100, offset = 0 } = payload;
    const logs = session.logs.slice(-limit - offset, -offset || undefined);

    this.send(client, {
      type: 'session:logs',
      data: {
        sessionId: payload.sessionId,
        logs,
        total: session.logs.length,
      },
    });
  }

  private handleGetSession(client: WSClient, payload: { sessionId: string }): void {
    if (!payload?.sessionId) {
      this.sendError(client, 'sessionId is required');
      return;
    }

    const db = getDB();
    const session = db.getSessionById(payload.sessionId);
    
    if (!session) {
      this.sendError(client, 'Session not found');
      return;
    }

    this.send(client, {
      type: 'session:data',
      data: { session },
    });
  }

  private send(client: WSClient, data: any): void {
    if (client.socket.readyState === 1) { // WebSocket.OPEN
      client.socket.send(JSON.stringify(data));
    }
  }

  private sendError(client: WSClient, message: string): void {
    this.send(client, {
      type: 'error',
      data: { message },
    });
  }

  private broadcast(subscription: SubscriptionType, data: any): void {
    const message = JSON.stringify(data);
    
    for (const client of this.clients.values()) {
      // Send to clients subscribed to this specific channel or 'all'
      if (client.subscriptions.has('all') || 
          client.subscriptions.has(subscription) ||
          (subscription.startsWith('session:') && client.subscriptions.has('sessions'))) {
        if (client.socket.readyState === 1) {
          client.socket.send(message);
        }
      }
    }
  }

  // Public method to broadcast to all connected clients
  broadcastToAll(data: any): void {
    const message = JSON.stringify(data);
    
    for (const client of this.clients.values()) {
      if (client.socket.readyState === 1) {
        client.socket.send(message);
      }
    }
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }
}

let wsManagerInstance: WebSocketManager | null = null;

export function getWebSocketManager(): WebSocketManager {
  if (!wsManagerInstance) {
    wsManagerInstance = new WebSocketManager();
  }
  return wsManagerInstance;
}

export function resetWebSocketManager(): void {
  wsManagerInstance = null;
}

export { WebSocketManager };
export type { WSClient, WSMessage, SubscriptionType };
