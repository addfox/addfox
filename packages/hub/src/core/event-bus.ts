import { EventEmitter } from 'events';
import type { Session, Project, LogEntry } from '../types.js';

// Define event types
export type HubEventType = 
  | 'session:created'
  | 'session:updated'
  | 'session:deleted'
  | 'session:log'
  | 'session:build-progress'
  | 'project:created'
  | 'project:updated'
  | 'project:deleted'
  | 'stats:updated';

export interface HubEventMap {
  'session:created': { session: Session };
  'session:updated': { sessionId: string; updates: Partial<Session>; session: Session };
  'session:deleted': { sessionId: string };
  'session:log': { sessionId: string; log: LogEntry };
  'session:build-progress': { sessionId: string; progress: number; message: string; stage?: 'init' | 'install' | 'build' | 'launch' | 'ready' | 'error' };
  'project:created': { project: Project };
  'project:updated': { projectId: string; updates: Partial<Project>; project: Project };
  'project:deleted': { projectId: string };
  'stats:updated': { stats: { projects: number; activeSessions: number; totalSessions: number } };
}

export type HubEventHandler<T extends HubEventType> = (payload: HubEventMap[T]) => void;

class HubEventBus extends EventEmitter {
  constructor() {
    super();
    // Increase max listeners to handle many WebSocket connections
    this.setMaxListeners(100);
  }

  emit<T extends HubEventType>(event: T, payload: HubEventMap[T]): boolean {
    return super.emit(event, payload);
  }

  on<T extends HubEventType>(event: T, handler: HubEventHandler<T>): this {
    return super.on(event, handler as (...args: any[]) => void);
  }

  off<T extends HubEventType>(event: T, handler: HubEventHandler<T>): this {
    return super.off(event, handler as (...args: any[]) => void);
  }

  once<T extends HubEventType>(event: T, handler: HubEventHandler<T>): this {
    return super.once(event, handler as (...args: any[]) => void);
  }
}

// Singleton instance
let eventBusInstance: HubEventBus | null = null;

export function getEventBus(): HubEventBus {
  if (!eventBusInstance) {
    eventBusInstance = new HubEventBus();
  }
  return eventBusInstance;
}

export function resetEventBus(): void {
  if (eventBusInstance) {
    eventBusInstance.removeAllListeners();
    eventBusInstance = null;
  }
}

export { HubEventBus };
