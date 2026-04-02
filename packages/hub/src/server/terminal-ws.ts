import { WebSocketServer, WebSocket } from 'ws';
import type { Server, IncomingMessage } from 'http';
import { getTerminalService } from '../core/terminal-service.js';
import { URL } from 'url';

export function createTerminalWebSocketServer(server: Server): WebSocketServer {
  // 使用 noServer: true 避免与已有的 WebSocketServer 冲突
  const wss = new WebSocketServer({ 
    noServer: true,
  });

  const terminalService = getTerminalService();

  // 手动处理 upgrade 请求
  server.on('upgrade', (request: IncomingMessage, socket, head) => {
    const pathname = request.url?.split('?')[0];
    
    if (pathname === '/api/terminal') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
    // 其他路径留给其他 WebSocketServer 处理
  });

  wss.on('connection', (ws: WebSocket, req) => {
    // 解析查询参数获取工作目录
    let cwd: string | undefined;
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      cwd = url.searchParams.get('cwd') || undefined;
    } catch {
      // ignore
    }

    console.log('[Terminal WS] New connection, cwd:', cwd);

    // 创建终端会话
    const session = terminalService.createSession(ws, cwd);

    // 发送会话 ID 给客户端
    ws.send(JSON.stringify({
      type: 'connected',
      sessionId: session.id,
      shell: session.shell,
      cwd: session.cwd,
    }));

    // 处理客户端消息
    ws.on('message', (data: Buffer) => {
      const message = data.toString('utf-8');
      terminalService.handleMessage(session.id, message);
    });

    // 处理连接关闭
    ws.on('close', (code: number, reason: Buffer) => {
      console.log(`[Terminal WS] Connection closed, code: ${code}, reason: ${reason.toString()}`);
      terminalService.closeSession(session.id, 'SIGTERM');
    });

    // 处理错误
    ws.on('error', (error: Error) => {
      console.error('[Terminal WS] Error:', error);
      terminalService.closeSession(session.id, 'SIGTERM');
    });
  });

  console.log('[Terminal WS] WebSocket server created at /api/terminal');

  return wss;
}
