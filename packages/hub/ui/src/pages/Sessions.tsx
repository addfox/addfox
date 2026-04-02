import { useState } from 'react';
import { useSessions, useSession, useSessionLogs, useStopSession, useDeleteSession, useRealtimeSessionLogs } from '@/hooks/use-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Square, 
  Terminal, 
  Clock,
  ChevronRight,
  Play,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Trash2,
} from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  starting: { label: 'Starting', color: 'bg-blue-500', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  building: { label: 'Building', color: 'bg-yellow-500', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  running: { label: 'Running', color: 'bg-green-500', icon: <Play className="h-3 w-3" /> },
  stopping: { label: 'Stopping', color: 'bg-orange-500', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  stopped: { label: 'Stopped', color: 'bg-gray-500', icon: <Square className="h-3 w-3" /> },
  error: { label: 'Error', color: 'bg-red-500', icon: <AlertCircle className="h-3 w-3" /> },
};

function formatDuration(startedAt: string, stoppedAt?: string): string {
  const start = new Date(startedAt).getTime();
  const end = stoppedAt ? new Date(stoppedAt).getTime() : Date.now();
  const diff = end - start;
  
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function SessionList() {
  const { data: sessions, isLoading } = useSessions();
  const stopSession = useStopSession();
  const deleteSession = useDeleteSession();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>('all');

  const filteredSessions = sessions?.filter(s => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['starting', 'building', 'running'].includes(s.status);
    if (filter === 'stopped') return ['stopped', 'error'].includes(s.status);
    return s.status === filter;
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="stopped">Stopped</TabsTrigger>
          <TabsTrigger value="error">Error</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          {filteredSessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No sessions found</h3>
                <p className="text-sm text-muted-foreground">
                  {filter === 'all' 
                    ? 'Start a development session from the Projects page'
                    : `No ${filter} sessions`}
                </p>
                <Button className="mt-4" asChild>
                  <Link to="/projects">Go to Projects</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map((session) => {
                const status = STATUS_CONFIG[session.status] || STATUS_CONFIG.stopped;
                
                return (
                  <Card 
                    key={session.id} 
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => navigate(`/sessions/${session.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{session.projectName}</h3>
                            <Badge className={cn("gap-1", status.color)}>
                              {status.icon}
                              {status.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(session.startedAt, session.stoppedAt)}
                            </span>
                            <span>Session: {session.id.slice(0, 8)}</span>
                            <Badge variant="outline">{session.browser}</Badge>
                          </div>
                          {session.serverUrl && (
                            <p className="text-xs text-muted-foreground">
                              Server: {session.serverUrl}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {['starting', 'building', 'running'].includes(session.status) && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                stopSession.mutate(session.id);
                              }}
                              disabled={stopSession.isPending}
                            >
                              <Square className="mr-1 h-3 w-3" />
                              Stop
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Are you sure you want to delete this session?')) {
                                deleteSession.mutate(session.id);
                              }
                            }}
                            disabled={deleteSession.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SessionDetail({ sessionId }: { sessionId: string }) {
  const { data: session, isLoading: sessionLoading } = useSession(sessionId);
  const { data: logsData } = useSessionLogs(sessionId, { limit: 100 });
  const { logs: realtimeLogs, isConnected } = useRealtimeSessionLogs(sessionId);
  const stopSession = useStopSession();
  const navigate = useNavigate();

  // Merge REST API logs with realtime logs
  const allLogs = [...(logsData?.logs || []), ...realtimeLogs];
  
  // Remove duplicates based on log id
  const uniqueLogs = allLogs.filter((log, index, self) => 
    index === self.findIndex(l => l.id === log.id)
  );

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Session not found</h3>
          <Button className="mt-4" onClick={() => navigate('/sessions')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sessions
          </Button>
        </CardContent>
      </Card>
    );
  }

  const status = STATUS_CONFIG[session.status] || STATUS_CONFIG.stopped;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/sessions')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{session.projectName}</h1>
            <p className="text-sm text-muted-foreground">
              Session {session.id.slice(0, 16)}... • Started {new Date(session.startedAt).toLocaleString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? 'Live' : 'Disconnected'}
          </Badge>
          {['starting', 'building', 'running'].includes(session.status) && (
            <Button
              variant="destructive"
              onClick={() => stopSession.mutate(session.id)}
              disabled={stopSession.isPending}
            >
              <Square className="mr-2 h-4 w-4" />
              Stop Session
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={cn("gap-1 text-white", status.color)}>
              {status.icon}
              {status.label}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(session.startedAt, session.stoppedAt)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Browser</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{session.browser}</Badge>
            {session.pid && (
              <p className="text-xs text-muted-foreground mt-1">PID: {session.pid}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {session.serverUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Dev Server</CardTitle>
          </CardHeader>
          <CardContent>
            <a 
              href={session.serverUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {session.serverUrl}
            </a>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Logs
          </CardTitle>
          <CardDescription>
            Real-time session logs {uniqueLogs.length > 0 && `(${uniqueLogs.length} entries)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] rounded-md border bg-muted p-4">
            <div className="space-y-2 font-mono text-sm">
              {uniqueLogs.length === 0 ? (
                <p className="text-muted-foreground">No logs available...</p>
              ) : (
                uniqueLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className={cn(
                      "flex gap-2",
                      log.level === 'error' && "text-red-500",
                      log.level === 'warn' && "text-yellow-500",
                      log.level === 'debug' && "text-gray-500",
                    )}
                  >
                    <span className="text-muted-foreground shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {log.source}
                    </Badge>
                    <span className="break-all">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export function Sessions() {
  const { id } = useParams<{ id: string }>();

  if (id) {
    return <SessionDetail sessionId={id} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
          <p className="text-muted-foreground">
            Manage your development sessions
          </p>
        </div>
        <Button asChild>
          <Link to="/projects">
            <Play className="mr-2 h-4 w-4" />
            New Session
          </Link>
        </Button>
      </div>

      <SessionList />
    </div>
  );
}
