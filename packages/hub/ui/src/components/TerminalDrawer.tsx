import { useState, useCallback, createContext, useContext, useRef, useEffect } from 'react';
import { XTerm, type XTermRef } from './XTerm';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Terminal as TerminalIcon, 
  X, 
  Minimize2, 
  Fullscreen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TerminalTab {
  id: string;
  projectId: string;
  projectName: string;
  cwd: string;
  isConnected: boolean;
}

interface TerminalDrawerContextType {
  tabs: TerminalTab[];
  activeTabId: string | null;
  isOpen: boolean;
  isMinimized: boolean;
  openTerminal: (projectId: string, projectName: string, cwd?: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  toggleDrawer: () => void;
  minimize: () => void;
  maximize: () => void;
}

const TerminalDrawerContext = createContext<TerminalDrawerContextType | null>(null);

let tabCounter = 0;

// 防抖函数
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  }) as T;
}

export function TerminalDrawerProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openTerminal = useCallback((projectId: string, projectName: string, cwd?: string) => {
    const id = `drawer-term-${++tabCounter}-${Date.now()}`;
    const newTab: TerminalTab = {
      id,
      projectId,
      projectName,
      cwd: cwd || '~',
      isConnected: false,
    };
    
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(id);
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const filtered = prev.filter(t => t.id !== tabId);
      if (filtered.length === 0) {
        setIsOpen(false);
      }
      return filtered;
    });
    setActiveTabId(prev => {
      if (prev !== tabId) return prev;
      const remaining = tabs.filter(t => t.id !== tabId);
      return remaining.length > 0 ? remaining[0].id : null;
    });
  }, [tabs]);

  const setActiveTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    setIsMinimized(false);
  }, []);

  const toggleDrawer = useCallback(() => {
    if (tabs.length === 0) return;
    setIsOpen(prev => !prev);
    setIsMinimized(false);
  }, [tabs.length]);

  const minimize = useCallback(() => {
    setIsMinimized(true);
    setIsOpen(false);
  }, []);

  const maximize = useCallback(() => {
    setIsMinimized(false);
    setIsOpen(true);
  }, []);

  return (
    <TerminalDrawerContext.Provider value={{
      tabs,
      activeTabId,
      isOpen,
      isMinimized,
      openTerminal,
      closeTab,
      setActiveTab,
      toggleDrawer,
      minimize,
      maximize,
    }}>
      {children}
      <TerminalDrawer />
    </TerminalDrawerContext.Provider>
  );
}

export function useTerminalDrawer() {
  const context = useContext(TerminalDrawerContext);
  if (!context) {
    throw new Error('useTerminalDrawer must be used within TerminalDrawerProvider');
  }
  return context;
}

function TerminalDrawer() {
  const { 
    tabs, 
    activeTabId, 
    isOpen, 
    isMinimized,
    closeTab, 
    setActiveTab,
    toggleDrawer,
    minimize,
  } = useTerminalDrawer();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [drawerHeight, setDrawerHeight] = useState(500);
  const [isDragging, setIsDragging] = useState(false);
  
  // 存储每个 tab 的 XTerm ref
  const xtermRefs = useRef<Map<string, XTermRef>>(new Map());
  
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const contentHeightRef = useRef(0);

  // 注册 XTerm ref
  const registerXTerm = useCallback((tabId: string, ref: XTermRef | null) => {
    if (ref) {
      xtermRefs.current.set(tabId, ref);
    } else {
      xtermRefs.current.delete(tabId);
    }
  }, []);

  // 防抖的 resize 函数
  const debouncedResize = useRef(
    debounce(() => {
      // Resize 所有终端（包括非活跃的，因为可能切换回来）
      xtermRefs.current.forEach((xtermRef) => {
        xtermRef.resize();
      });
    }, 150)
  ).current;

  // 当抽屉高度变化时，触发终端 resize
  useEffect(() => {
    if (isOpen && !isMinimized && !isFullscreen) {
      // 计算内容区域高度
      const contentHeight = drawerHeight - 40; // 减去 header 高度
      if (contentHeight !== contentHeightRef.current) {
        contentHeightRef.current = contentHeight;
        debouncedResize();
      }
    }
  }, [drawerHeight, isOpen, isMinimized, isFullscreen, debouncedResize]);

  // 当切换到全屏时，也需要 resize
  useEffect(() => {
    if (isFullscreen && isOpen) {
      // 全屏切换时延迟执行，等待动画完成
      const timer = setTimeout(() => {
        xtermRefs.current.forEach((xtermRef) => {
          xtermRef.resize();
        });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isFullscreen, isOpen]);

  // 当切换 tab 时，resize 当前 tab 的终端
  useEffect(() => {
    if (activeTabId && isOpen && !isMinimized) {
      // 延迟执行，确保 DOM 已经更新
      const timer = setTimeout(() => {
        const xtermRef = xtermRefs.current.get(activeTabId);
        if (xtermRef) {
          xtermRef.resize();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTabId, isOpen, isMinimized]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startHeightRef.current = drawerHeight;
    
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, [drawerHeight]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startYRef.current - e.clientY;
      const newHeight = Math.max(200, Math.min(800, startHeightRef.current + delta));
      setDrawerHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp, { once: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (tabs.length === 0) return null;

  return (
    <>
      {/* Terminal Drawer */}
      <div 
        className={cn(
          "fixed z-40 bg-dark-900 border-t border-dark-800 shadow-2xl shadow-black/50 transition-all duration-150 ease-out",
          "lg:left-64",
          "left-0",
          "right-0",
          isOpen && !isMinimized 
            ? isFullscreen 
              ? "top-0 h-screen" 
              : "bottom-0"
            : "h-0 opacity-0 pointer-events-none"
        )}
        style={!isFullscreen ? { height: isOpen && !isMinimized ? drawerHeight : 0 } : undefined}
      >
        {/* Resize Handle */}
        {!isFullscreen && isOpen && !isMinimized && (
          <div
            className={cn(
              "absolute top-0 left-0 right-0 h-2 -mt-1 cursor-row-resize z-50 flex items-center justify-center",
              isDragging && "bg-fox-500/20"
            )}
            onMouseDown={handleResizeStart}
          >
            <div className={cn(
              "w-12 h-1 rounded-full bg-dark-700 transition-colors",
              isDragging && "bg-fox-500"
            )} />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-800 px-4 py-2 bg-dark-800/50 h-10 shrink-0">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {tabs.length > 0 ? (
              <Tabs value={activeTabId || ''} onValueChange={setActiveTab}>
                <TabsList className="h-7 bg-dark-800">
                  {tabs.map(tab => (
                    <TabsTrigger 
                      key={tab.id} 
                      value={tab.id}
                      className="h-6 px-2 text-xs relative data-[state=active]:bg-fox-500 data-[state=active]:text-white"
                    >
                      <span className="truncate max-w-[100px]">{tab.projectName}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(tab.id);
                        }}
                        className="ml-1 p-0.5 rounded hover:bg-white/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {tab.isConnected && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500" />
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            ) : (
              <span className="text-sm text-dark-500">No terminals open</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-dark-400 hover:text-white hover:bg-dark-700" 
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              <Fullscreen className={cn("h-4 w-4", isFullscreen && "rotate-180")} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-dark-400 hover:text-white hover:bg-dark-700" 
              onClick={minimize}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-dark-400 hover:text-white hover:bg-dark-700" 
              onClick={toggleDrawer}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Terminal Content */}
        <div 
          className="relative overflow-hidden"
          style={{ height: isFullscreen ? 'calc(100% - 40px)' : drawerHeight - 40 }}
        >
          {tabs.map(tab => (
            <div 
              key={tab.id}
              className={cn(
                "absolute inset-0 p-2 transition-opacity duration-150",
                tab.id === activeTabId ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              )}
            >
              <XTerm
                ref={(ref) => registerXTerm(tab.id, ref)}
                wsUrl="/api/terminal"
                cwd={tab.cwd === '~' ? undefined : tab.cwd}
                theme="dark"
                fontSize={13}
              />
            </div>
          ))}
          {tabs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-dark-500">
              <TerminalIcon className="h-12 w-12 mb-2 opacity-20" />
              <p>Select a terminal tab or open a new one from a project</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Navigation bar component to be used in Layout
export function TerminalNavButton() {
  const { tabs, isOpen, isMinimized, toggleDrawer, maximize } = useTerminalDrawer();
  
  if (tabs.length === 0) return null;

  const connectedCount = tabs.filter(t => t.isConnected).length;

  return (
    <button
      onClick={() => isMinimized || !isOpen ? maximize() : toggleDrawer()}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 w-full",
        isOpen && !isMinimized
          ? "bg-fox-500/10 text-fox-400 border-l-2 border-fox-500" 
          : "text-dark-400 hover:bg-dark-800 hover:text-dark-200"
      )}
    >
      <div className="relative">
        <TerminalIcon className="h-4 w-4" />
        {connectedCount > 0 && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500" />
        )}
      </div>
      <span className="flex-1">Terminals</span>
      <span className="text-xs bg-dark-800 px-1.5 py-0.5 rounded text-dark-400">
        {tabs.length}
      </span>
    </button>
  );
}
