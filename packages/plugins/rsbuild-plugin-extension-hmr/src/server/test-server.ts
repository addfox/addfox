import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";

/** Test helper: minimal WebSocket server with notifyReload. */
export function createTestWsServer(
  port: number
): Promise<{
  close: () => Promise<void>;
  notifyReload: () => void;
}> {
  const http = createServer();
  const wss = new WebSocketServer({ server: http });
  wss.on("connection", (ws: WebSocket) => {
    if (ws.readyState === WebSocket.OPEN) ws.send("connected");
  });
  return new Promise((resolve, reject) => {
    http.listen(port, () => {
      resolve({
        close: () =>
          new Promise((done) => {
            wss.close(() => { http.close(() => done()); });
          }),
        notifyReload() {
          wss.clients.forEach((client: WebSocket) => {
            if (client.readyState === WebSocket.OPEN) client.send("reload-extension");
          });
        },
      });
    });
    http.on("error", reject);
  });
}
