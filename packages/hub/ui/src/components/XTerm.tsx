import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

export interface XTermProps {
  /** WebSocket URL */
  wsUrl: string;
  /** 初始工作目录 */
  cwd?: string;
  /** 连接成功回调 */
  onConnect?: () => void;
  /** 连接关闭回调 */
  onDisconnect?: (code: number, reason: string) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 主题 */
  theme?: 'dark' | 'light';
  /** 字体大小 */
  fontSize?: number;
  /** 字体族 */
  fontFamily?: string;
}

export interface XTermRef {
  /** 调整终端大小以适应容器 */
  resize: () => void;
  /** 获取当前终端尺寸 */
  getDimensions: () => { cols: number; rows: number } | null;
}

export const XTerm = forwardRef<XTermRef, XTermProps>(function XTerm({
  wsUrl,
  cwd,
  onConnect,
  onDisconnect,
  onError,
  theme = 'dark',
  fontSize = 14,
  fontFamily = 'Menlo, Monaco, "Courier New", monospace',
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 使用 ref 存储回调，避免 useEffect 依赖变化
  const callbacksRef = useRef({ onConnect, onDisconnect, onError });
  callbacksRef.current = { onConnect, onDisconnect, onError };

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    resize: () => {
      if (fitAddonRef.current && terminalRef.current) {
        fitAddonRef.current.fit();
        // 通知后端新的尺寸
        if (wsRef.current?.readyState === WebSocket.OPEN && sessionIdRef.current) {
          const { cols, rows } = terminalRef.current;
          wsRef.current.send(JSON.stringify({
            type: 'resize',
            cols,
            rows,
          }));
        }
      }
    },
    getDimensions: () => {
      if (terminalRef.current) {
        return {
          cols: terminalRef.current.cols,
          rows: terminalRef.current.rows,
        };
      }
      return null;
    },
  }));

  // 主题配置 - 稳定引用
  const getTheme = useCallback(() => {
    if (theme === 'dark') {
      return {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        cursorAccent: '#1e1e1e',
        selectionBackground: '#264f78',
        selectionForeground: '#ffffff',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      };
    }
    return {
      background: '#ffffff',
      foreground: '#333333',
      cursor: '#333333',
      cursorAccent: '#ffffff',
      selectionBackground: '#add6ff',
      selectionForeground: '#000000',
    };
  }, [theme]);

  // 创建终端
  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      fontSize,
      fontFamily,
      theme: getTheme(),
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // 处理窗口大小变化
    const handleResize = () => {
      fitAddon.fit();
      if (wsRef.current?.readyState === WebSocket.OPEN && sessionIdRef.current) {
        const { cols, rows } = terminal;
        wsRef.current.send(JSON.stringify({
          type: 'resize',
          cols,
          rows,
        }));
      }
    };

    window.addEventListener('resize', handleResize);

    // 初始化 WebSocket 连接
    const connect = () => {
      const url = new URL(wsUrl, window.location.href);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      if (cwd) {
        url.searchParams.set('cwd', cwd);
      }

      const ws = new WebSocket(url.toString());
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[XTerm] WebSocket connected');
        terminal.writeln('\r\n\x1b[32m[Connected]\x1b[0m Initializing terminal...\r\n');
        
        // 发送初始大小
        const { cols, rows } = terminal;
        ws.send(JSON.stringify({
          type: 'resize',
          cols,
          rows,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          switch (msg.type) {
            case 'connected':
              sessionIdRef.current = msg.sessionId;
              console.log('[XTerm] Session created:', msg.sessionId, 'shell:', msg.shell);
              callbacksRef.current.onConnect?.();
              break;

            case 'output':
              // 输出到终端
              terminal.write(msg.data);
              break;

            case 'exit':
              terminal.writeln(`\r\n\x1b[31m[Disconnected] Exit code: ${msg.exitCode}\x1b[0m`);
              callbacksRef.current.onDisconnect?.(msg.exitCode, 'Process exited');
              break;

            case 'pong':
              // 心跳响应
              break;

            default:
              console.warn('[XTerm] Unknown message type:', msg.type);
          }
        } catch (err) {
          console.error('[XTerm] Failed to parse message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('[XTerm] WebSocket closed:', event.code, event.reason);
        terminal.writeln(`\r\n\x1b[31m[Disconnected] Code: ${event.code}\x1b[0m`);
        callbacksRef.current.onDisconnect?.(event.code, event.reason);
        
        // 清理
        sessionIdRef.current = null;
        wsRef.current = null;
      };

      ws.onerror = (error) => {
        console.error('[XTerm] WebSocket error:', error);
        callbacksRef.current.onError?.(new Error('WebSocket connection failed'));
      };
    };

    connect();

    // 处理终端输入
    const disposable = terminal.onData((data) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'input',
          data,
        }));
      }
    });

    // 心跳保持连接
    const heartbeat = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => {
      window.removeEventListener('resize', handleResize);
      disposable.dispose();
      clearInterval(heartbeat);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      wsRef.current?.close();
      terminal.dispose();
      
      terminalRef.current = null;
      fitAddonRef.current = null;
      wsRef.current = null;
    };
  }, [wsUrl, cwd, theme, fontSize, fontFamily, getTheme]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[300px] bg-[#1e1e1e] rounded overflow-hidden"
      style={{ 
        padding: '4px',
        fontFamily: fontFamily,
      }}
    />
  );
});

export default XTerm;
