import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
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
  };
  discoveredAt: string;
  lastDevAt?: string;
  workspace?: {
    root: string;
    name: string;
  };
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
      const { data } = await api.get<Project[]>('/projects');
      return data;
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

// Sessions
export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await api.get<Session[]>('/sessions');
      return data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { projectId: string; browser?: string }) => {
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

// Stats
export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const { data } = await api.get<Stats>('/stats');
      return data;
    },
    refetchInterval: 5000,
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
