import { useState, useCallback, useMemo } from 'react';
import { XTerm } from '@/components/XTerm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Terminal as TerminalIcon, 
  Plus,
  Trash2,
  FolderOpen,
  Power,
  PowerOff,
} from 'lucide-react';

interface TerminalInstance {
  id: string;
  cwd: string;
  name: string;
  isConnected: boolean;
}

export function Terminal() {
  const [terminals, setTerminals] = useState<TerminalInstance[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const [newCwd, setNewCwd] = useState('');
  const [counter, setCounter] = useState(1);

  const createTerminal = useCallback(() => {
    const id = `term-${Date.now()}-${counter}`;
    const cwd = newCwd.trim() || undefined;
    
    const newTerminal: TerminalInstance = {
      id,
      cwd: cwd || '~',
      name: `Terminal ${counter}${cwd ? ` (${cwd})` : ''}`,
      isConnected: false,
    };
    
    setTerminals(prev => [...prev, newTerminal]);
    setActiveTerminalId(id);
    setCounter(c => c + 1);
    setNewCwd('');
  }, [counter, newCwd]);

  const closeTerminal = useCallback((id: string) => {
    setTerminals(prev => prev.filter(t => t.id !== id));
    if (activeTerminalId === id) {
      setActiveTerminalId(null);
    }
  }, [activeTerminalId]);

  const handleConnect = useCallback((id: string) => {
    setTerminals(prev => prev.map(t => 
      t.id === id ? { ...t, isConnected: true } : t
    ));
  }, []);

  const handleDisconnect = useCallback((id: string) => {
    setTerminals(prev => prev.map(t => 
      t.id === id ? { ...t, isConnected: false } : t
    ));
  }, []);

  const activeTerminal = useMemo(() => 
    terminals.find(t => t.id === activeTerminalId),
    [terminals, activeTerminalId]
  );

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Terminal</h1>
          <p className="text-muted-foreground">
            Interactive shell with real TTY support
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {terminals.filter(t => t.isConnected).length} active
          </Badge>
        </div>
      </div>

      {/* New Terminal Input */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex-1 max-w-md">
          <FolderOpen className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Working directory (optional)..."
            value={newCwd}
            onChange={(e) => setNewCwd(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createTerminal()}
            className="pl-8"
          />
        </div>
        <Button onClick={createTerminal} disabled={terminals.length >= 5}>
          <Plus className="mr-2 h-4 w-4" />
          New Terminal
        </Button>
      </div>

      {/* Terminal Tabs */}
      {terminals.length > 0 && (
        <div className="flex items-center gap-2 border-b pb-2 shrink-0 overflow-x-auto">
          {terminals.map(term => (
            <button
              key={term.id}
              onClick={() => setActiveTerminalId(term.id)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md text-sm
                transition-colors whitespace-nowrap
                ${activeTerminalId === term.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted hover:bg-muted/80'}
              `}
            >
              {term.isConnected ? (
                <Power className="h-3 w-3 text-green-400" />
              ) : (
                <PowerOff className="h-3 w-3 text-gray-400" />
              )}
              <span className="max-w-[150px] truncate">{term.name}</span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  closeTerminal(term.id);
                }}
                className="ml-1 p-0.5 rounded hover:bg-black/20 cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Terminal Container */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TerminalIcon className="h-4 w-4" />
              <CardTitle className="text-sm font-medium">
                {activeTerminal ? activeTerminal.name : 'No Terminal'}
              </CardTitle>
              {activeTerminal?.isConnected && (
                <Badge variant="default" className="text-[10px] bg-green-500">
                  Connected
                </Badge>
              )}
            </div>
            {activeTerminal && (
              <div className="text-xs text-muted-foreground">
                CWD: {activeTerminal.cwd}
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0 min-h-0 relative">
          {activeTerminal ? (
            <XTerm
              wsUrl="/api/terminal"
              cwd={activeTerminal.cwd === '~' ? undefined : activeTerminal.cwd}
              onConnect={() => handleConnect(activeTerminal.id)}
              onDisconnect={() => handleDisconnect(activeTerminal.id)}
              onError={(err) => console.error('Terminal error:', err)}
              theme="dark"
              fontSize={14}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <TerminalIcon className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg">No terminal session</p>
              <p className="text-sm">Click "New Terminal" to start a shell</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Tips */}
      <div className="text-xs text-muted-foreground shrink-0">
        <p>Supports: vim, nano, git, pnpm, npm, node, python, and any interactive CLI tool</p>
        <p>Press Ctrl+C to interrupt, Ctrl+D to exit, Ctrl+L to clear</p>
      </div>
    </div>
  );
}

export default Terminal;
