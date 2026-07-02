import { getBrowser, type Browser } from "@addfox/browser";
import { isEnvelope } from "./helpers.js";
import type {
  Envelope,
  HandlerContext,
  MessageHandler,
  PortChannel,
  PortChannelOptions,
} from "./types.js";

export function createPortChannel(options: PortChannelOptions): PortChannel {
  const browser: Browser = options.browser ?? getBrowser();
  const listeners = new Set<MessageHandler<unknown>>();
  let connected = true;

  const port = browser.runtime.connect({ name: options.name ?? "afm-port" });

  const messageListener = (raw: unknown) => {
    if (!isEnvelope(raw)) return undefined;
    const env = raw;
    if (env.to !== options.from || env.from !== options.to) return undefined;

    const ctx: HandlerContext = {
      from: env.from,
      to: env.to,
      id: env.id,
    };

    listeners.forEach((handler) => {
      Promise.resolve(handler(env.payload, ctx)).catch(
        /* istanbul ignore next */
        () => {
          // User errors are not bubbled.
        }
      );
    });

    return undefined;
  };

  port.onMessage.addListener(messageListener);

  const disconnectListener = () => {
    connected = false;
    cleanup();
    options.onDisconnect?.();
  };

  if (port.onDisconnect) {
    port.onDisconnect.addListener(disconnectListener);
  }

  function cleanup() {
    port.onMessage.removeListener(messageListener);
    if (port.onDisconnect) {
      port.onDisconnect.removeListener(disconnectListener);
    }
  }

  function post<P>(payload: P) {
    if (!connected) {
      throw new Error("[@addfox/message] Port is disconnected");
    }
    const envelope: Envelope<P> = {
      __afm: true,
      kind: "message",
      from: options.from,
      to: options.to,
      payload,
    };
    port.postMessage(envelope as unknown as object);
  }

  function on<P>(handler: MessageHandler<P>): () => void {
    const wrapped = handler as MessageHandler<unknown>;
    listeners.add(wrapped);
    return () => listeners.delete(wrapped);
  }

  function disconnect() {
    if (!connected) return;
    connected = false;
    cleanup();
    port.disconnect();
  }

  function isConnected() {
    return connected;
  }

  return { post, on, disconnect, isConnected };
}
