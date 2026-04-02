import { useState, useRef, useEffect } from 'react';
import { useSessions, useRealtimeSessionLogs, type LogEntry } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Terminal as TerminalIcon, 
  Pause,
  Play,
  Search,
  Download,
  AlertCircle,
  Info,
  AlertTriangle,
  Bug,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const LOG_LEVEL_ICONS = {
  debug: <Bug className="h-3 w-3" />,
  info: <Info className="h-3 w-3" />,
  warn: <AlertTriangle className="h-3 w-3" />,
  error: <AlertCircle className="h-3 w-3" />,
};

const LOG_LEVEL_COLORS = {
  debug: 'text-gray-500',
  info: 'text-blue-500',
  warn: 'text-yellow-500',
  error: 'text-red-500',
};

const LOG_LEVEL_BADGES = {
  debug: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  warn: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  error: 'bg-red-500/10 text-red-500 border-red-500/20',
};

interface LogLineProps {
  log: LogEntry;
  showTimestamp: boolean;
  showSource: boolean;
}

function LogLine({ log, showTimestamp, showSource }: LogLineProps) {
  return (
    <div className={cn(
      "flex gap-2 py-0.5 font-mono text-sm hover:bg-muted/50",
      LOG_LEVEL_COLORS[log.level]
    )}>
      {showTimestamp && (
        <span className="shrink-0 text-muted-foreground w-[100px]">
          {new Date(log.timestamp).toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
      )}
      
      <Badge 
        variant="outline" 
        className={cn(
          "shrink-0 text-[10px] px-1 py-0 h-5 min-w-[60px] justify-center",
          LOG_LEVEL_BADGES[log.level]
        )}
      >
        {LOG_LEVEL_ICONS[log.level]}
        <span className="ml-1 uppercase">{log.level}</span>
      </Badge>

      {showSource && (
        <Badge variant="outline" className="shrink-0 text-[10px] px-1 py-0 h-5">
          {log.source}
        </Badge>
      )}
      
      <span className="break-all">{log.message}</span>
    </div>
  );
}

export function Logs() {
  const { data: sessions } = useSessions();
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTimestamp, setShowTimestamp] = useState(true);
  const [showSource, setShowSource] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Get active sessions for the selector
  const activeSessions = sessions?.filter(s => 
    ['starting', 'building', 'running'].includes(s.status)
  ) || [];

  // Auto-select first active session
  useEffect(() => {
    if (!selectedSessionId && activeSessions.length > 0) {
      setSelectedSessionId(activeSessions[0].id);
    }
  }, [activeSessions, selectedSessionId]);

  // Real-time logs
  const { logs: realtimeLogs, isConnected } = useRealtimeSessionLogs(selectedSessionId);

  // Filter logs
  const filteredLogs = realtimeLogs.filter(log => {
    if (filterLevel && log.level !== filterLevel) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(query) ||
        log.source.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (!isPaused && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, isPaused]);

  const handleExport = () => {
    const content = filteredLogs.map(log => 
      `[${new Date(log.timestamp).toISOString()}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${selectedSessionId.slice(0, 8)}-logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const stats = {
    total: filteredLogs.length,
    errors: filteredLogs.filter(l => l.level === 'error').length,
    warnings: filteredLogs.filter(l => l.level === 'warn').length,
    info: filteredLogs.filter(l => l.level === 'info').length,
    debug: filteredLogs.filter(l => l.level === 'debug').length,
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Terminal</h1>
          <p className="text-muted-foreground">
            Real-time session logs and build output
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? 'Live' : 'Disconnected'}
          </Badge>
        </div>
      </div>

      {/* Session Selector */}
      <div className="flex items-center gap-2">
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={selectedSessionId}
          onChange={(e) => setSelectedSessionId(e.target.value)}
        >
          <option value="">Select a session...</option>
          {activeSessions.map(session => (
            <option key={session.id} value={session.id}>
              {session.projectName} ({session.browser}) - {session.status}
            </option>
          ))}
        </select>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsPaused(!isPaused)}
        >
          {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={filteredLogs.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['error', 'warn', 'info', 'debug'] as const).map((level) => (
            <Button
              key={level}
              variant={filterLevel === level ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterLevel(filterLevel === level ? null : level)}
              className={cn(
                "text-xs capitalize",
                filterLevel === level && level === 'error' && "bg-red-500 hover:bg-red-600",
                filterLevel === level && level === 'warn' && "bg-yellow-500 hover:bg-yellow-600",
                filterLevel === level && level === 'info' && "bg-blue-500 hover:bg-blue-600",
                filterLevel === level && level === 'debug' && "bg-gray-500 hover:bg-gray-600",
              )}
            >
              {level}
              <span className="ml-1 opacity-70">
                {stats[level as keyof typeof stats]}
              </span>
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 border-l pl-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showTimestamp}
              onChange={(e) => setShowTimestamp(e.target.checked)}
              className="rounded border-input"
            />
            Timestamp
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showSource}
              onChange={(e) => setShowSource(e.target.checked)}
              className="rounded border-input"
            />
            Source
          </label>
        </div>
      </div>

      {/* Terminal */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TerminalIcon className="h-4 w-4" />
              <CardTitle className="text-sm font-medium">
                {selectedSessionId 
                  ? `Session: ${selectedSessionId.slice(0, 16)}...` 
                  : 'No session selected'}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{stats.total} lines</span>
              {stats.errors > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.errors} errors
                </Badge>
              )}
              {stats.warnings > 0 && (
                <Badge variant="default" className="bg-yellow-500 text-xs">
                  {stats.warnings} warnings
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 min-h-0">
          <ScrollArea className="h-[calc(100vh-20rem)]" ref={scrollRef}>
            <div className="p-4">
              {selectedSessionId ? (
                filteredLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <TerminalIcon className="h-12 w-12 mb-4" />
                    <p>No logs available yet...</p>
                    {isPaused && <p className="text-sm">(Terminal is paused)</p>}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {filteredLogs.map((log) => (
                      <LogLine
                        key={log.id}
                        log={log}
                        showTimestamp={showTimestamp}
                        showSource={showSource}
                      />
                    ))}
                    <div ref={bottomRef} />
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <TerminalIcon className="h-12 w-12 mb-4" />
                  <p>Select a session to view logs</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
