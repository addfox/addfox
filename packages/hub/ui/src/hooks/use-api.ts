import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useRef, useState, useCallback } from 'react';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

export interface Project {
  id: string;
  name: string;
  path: string;
  tool: 'addfox' | 'wxt' | 'plasmo' | 'vanilla';
  manifest?: {
    name: string;
    version: string;
    description?: string;
    manifest_version?: number;
    permissions?: string[];
  };
  packageJson?: {
    name?: string;
    version?: string;
    description?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
    [key: string]: unknown;
  };
  discoveredAt: string;
  lastModified?: string;
  lastDevAt?: string;
  workspace?: {
    root: string;
    name: string;
  };
  tags?: string[];
  buildCount?: number;
  devSessionCount?: number;
  source?: 'scan' | 'manual';
  devCommand?: string;
  buildCommand?: string;
}

export interface Session {
  id: string;
  projectId: string;
  projectName: string;
  browser: string;
  status: 'starting' | 'building' | 'running' | 'stopping' | 'error' | 'stopped';
  startedAt: string;
  stoppedAt?: string;
  outputPath?: string;
  serverUrl?: string;
  buildPid?: number;
  pid?: number;
  logs?: LogEntry[];
  errors?: LogEntry[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  source: 'build' | 'browser' | 'extension' | 'system';
  message: string;
  details?: any;
}

export interface Stats {
  projects: number;
  activeSessions: number;
  totalSessions: number;
}

// Projects
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get<{ projects: Project[]; pagination: any }>('/projects');
      return data.projects;
    },
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const { data } = await api.get<Project>(`/projects/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useProjectSessions(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'sessions'],
    queryFn: async () => {
      const { data } = await api.get<Session[]>(`/projects/${projectId}/sessions`);
      return data;
    },
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (project: { path: string; name?: string }) => {
      const { data } = await api.post<Project>('/projects', project);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useRefreshProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<Project>(`/projects/${id}/refresh`);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', data.id] });
    },
  });
}

export interface ProjectDevInfo {
  tool: string;
  adapter: string;
  devCommand?: string;
  buildCommand?: string;
  resolvedDevCommand: string;
  resolvedBuildCommand: string;
  commandSource: 'custom' | 'auto';
  hasPackageJson: boolean;
  scripts: string[];
}

export function useProjectDevInfo(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'dev-info'],
    queryFn: async () => {
      const { data } = await api.get<ProjectDevInfo>(`/projects/${projectId}/dev-info`);
      return data;
    },
    enabled: !!projectId,
  });
}

// Sessions
export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await api.get<Session[]>('/sessions');
      return data;
    },
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: ['sessions', id],
    queryFn: async () => {
      const { data } = await api.get<Session>(`/sessions/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useSessionLogs(id: string, options?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['sessions', id, 'logs', options],
    queryFn: async () => {
      const { data } = await api.get<{ logs: LogEntry[]; total: number }>(`/sessions/${id}/logs`, {
        params: options,
      });
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { projectId: string; browser?: string; headless?: boolean }) => {
      const { data } = await api.post<Session>('/sessions', params);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useStopSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sessions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sessions/${id}/permanent`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useUpdateProjectCommands() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, devCommand, buildCommand }: { id: string; devCommand?: string; buildCommand?: string }) => {
      const { data } = await api.patch(`/projects/${id}/commands`, { devCommand, buildCommand });
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['projects', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['projects', vars.id, 'dev-info'] });
    },
  });
}

export function useBuildProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/projects/${id}/build`);
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['projects', id] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// Stats
export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const { data } = await api.get<Stats>('/stats');
      return data;
    },
  });
}

// Scan
export function useScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (path?: string) => {
      const { data } = await api.post('/scan', { path });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// Settings
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data;
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: any) => {
      const { data } = await api.patch('/settings', settings);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

// WebSocket hook for real-time updates
type WSMessageType = 
  | 'init'
  | 'subscribed'
  | 'unsubscribed'
  | 'session:created'
  | 'session:updated'
  | 'session:deleted'
  | 'session:log'
  | 'session:logs'
  | 'session:data'
  | 'project:created'
  | 'project:updated'
  | 'project:deleted'
  | 'stats:updated'
  | 'error'
  | 'pong';

interface WSMessage {
  type: WSMessageType;
  data?: any;
  timestamp?: number;
}

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    let wsUrl: string;
    
    if (apiBaseUrl) {
      // 使用配置的 API 地址
      const baseUrl = apiBaseUrl.replace('/api', '');
      wsUrl = `${baseUrl.replace('http', 'ws')}/api/ws`;
    } else {
      // 使用当前 host
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/api/ws`;
    }

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setIsConnected(true);
      // Subscribe to all events by default
      // Use setTimeout to ensure we're in OPEN state
      setTimeout(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ 
            type: 'subscribe', 
            payload: ['all', 'sessions', 'projects', 'stats'] 
          }));
        }
      }, 0);
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      // Auto reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.current.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        setLastMessage(message);

        // Handle different message types
        switch (message.type) {
          case 'session:created':
          case 'session:updated':
          case 'session:deleted':
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            queryClient.invalidateQueries({ queryKey: ['stats'] });
            break;
          case 'project:created':
          case 'project:updated':
          case 'project:deleted':
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['stats'] });
            break;
          case 'stats:updated':
            queryClient.invalidateQueries({ queryKey: ['stats'] });
            break;
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };
  }, [queryClient]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    ws.current?.close();
  }, []);

  const send = useCallback((message: { type: string; payload?: any }) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribe = useCallback((channels: string[]) => {
    send({ type: 'subscribe', payload: channels });
  }, [send]);

  const unsubscribe = useCallback((channels: string[]) => {
    send({ type: 'unsubscribe', payload: channels });
  }, [send]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    send,
    subscribe,
    unsubscribe,
  };
}

// Hook for real-time session logs
export function useRealtimeSessionLogs(sessionId: string) {
  const { isConnected, lastMessage, subscribe, unsubscribe } = useWebSocket();
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Subscribe to specific session
  useEffect(() => {
    if (!sessionId || !isConnected) return;
    
    subscribe([`session:${sessionId}`]);
    
    return () => {
      unsubscribe([`session:${sessionId}`]);
    };
  }, [sessionId, isConnected, subscribe, unsubscribe]);

  // Handle incoming logs
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'session:log' && lastMessage.data?.sessionId === sessionId) {
      setLogs(prev => [...prev, lastMessage.data.log]);
    }

    if (lastMessage.type === 'session:logs' && lastMessage.data?.sessionId === sessionId) {
      setLogs(lastMessage.data.logs);
    }
  }, [lastMessage, sessionId]);

  return { logs, isConnected };
}

export { api };
