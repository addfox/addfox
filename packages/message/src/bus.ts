import { getBrowser, type Browser } from "@addfox/browser";
import { createMsgId } from "./id.js";
import { isEnvelope } from "./helpers.js";
import {
  BROADCAST_ENDPOINT,
  RpcErrorCode,
} from "./types.js";
import type {
  Endpoint,
  Envelope,
  HandlerContext,
  MessageHandler,
  MessagePayload,
  MessageSchema,
  Messaging,
  MessagingOptions,
  OnOptions,
  RpcError,
  RpcRequest,
  RpcResponse,
  RpcSchema,
  SendOptions,
} from "./types.js";

interface PendingCall {
  resolve: (response: RpcResponse) => void;
  reject: (reason: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface MessageSender {
  tab?: { id?: number };
}

interface StoredHandler {
  handler: MessageHandler<unknown>;
  options: OnOptions;
  once: boolean;
}

function getDefaultContext(): string | undefined {
  try {
    return (globalThis as any).__addfox__?.context;
    /* istanbul ignore next */
  } catch {
    return undefined;
  }
}

function matchesFromFilter(
  from: string,
  filter: Endpoint | Endpoint[] | undefined
): boolean {
  if (filter === undefined) return true;
  if (Array.isArray(filter)) return filter.includes(from);
  return filter === from;
}

export function defineMessaging<
  TMessageSchema extends MessageSchema = MessageSchema,
  TRpcSchema extends RpcSchema = RpcSchema,
>(options: MessagingOptions = {}): Messaging<TMessageSchema, TRpcSchema> {
  const context = (() => {
    const c = options.context ?? getDefaultContext();
    if (!c) {
      throw new Error(
        "[@addfox/message] `context` is required. Either pass it in `defineMessaging({ context })` or ensure `__addfox__.context` is injected by the build system."
      );
    }
    return c;
  })();

  const defaultTo = options.to;
  const browser: Browser = options.browser ?? getBrowser();

  let installed = false;
  const handlers = new Map<string, Set<StoredHandler>>();
  const rpcHandlers = new Map<string, (...params: any[]) => unknown>();
  const pending = new Map<string, PendingCall>();

  function install() {
    if (installed) return;
    installed = true;

    browser.runtime.onMessage.addListener(
      (raw: unknown, sender?: MessageSender) => {
        if (!isEnvelope(raw)) return undefined;
        const env = raw;

        // 1. Fulfill pending RPC calls.
        if (env.kind === "response" && env.id) {
          const p = pending.get(env.id);
          if (p && env.to === context) {
            clearTimeout(p.timer);
            pending.delete(env.id);
            p.resolve(env.payload as RpcResponse);
            return undefined;
          }
        }

        // 2. Handle RPC requests.
        if (env.kind === "request" && env.id) {
          const req = env.payload as RpcRequest;
          const rpc = rpcHandlers.get(req.method);
          if (rpc) {
            Promise.resolve()
              .then(() => rpc(...req.params))
              .then(
                (result) => sendRpcResponse(env.from, env.id!, { result }),
                (err: unknown) =>
                  sendRpcResponse(env.from, env.id!, {
                    error: normalizeError(err, RpcErrorCode.HandlerError),
                  })
              );
          } else {
            sendRpcResponse(env.from, env.id, {
              error: {
                code: RpcErrorCode.MethodNotFound,
                message: `RPC method "${req.method}" is not registered`,
              },
            });
          }
          return undefined;
        }

        // 3. Dispatch to user handlers by type.
        if (
          env.type &&
          (env.to === context || env.to === BROADCAST_ENDPOINT)
        ) {
          const typeHandlers = handlers.get(env.type);
          if (typeHandlers) {
            const ctx: HandlerContext = {
              from: env.from,
              to: env.to,
              tabId: sender?.tab?.id,
              id: env.id,
            };
            typeHandlers.forEach((stored) => {
              if (!matchesFromFilter(env.from, stored.options.from)) return;

              Promise.resolve(stored.handler(env.payload, ctx)).catch(
                /* istanbul ignore next */
                () => {
                  // User errors are intentionally not bubbled here.
                }
              );

              if (stored.once) {
                typeHandlers.delete(stored);
              }
            });
          }
        }

        return undefined;
      }
    );
  }

  function normalizeError(err: unknown, code?: string): RpcError {
    if (err instanceof Error) {
      return { message: err.message, code };
    }
    return { message: String(err ?? "Unknown error"), code };
  }

  async function sendEnvelope<T>(to: Endpoint, envelope: Envelope<T>) {
    if (typeof to === "number") {
      if (typeof browser.tabs?.sendMessage !== "function") {
        throw new Error("tabs.sendMessage is not available");
      }
      await browser.tabs.sendMessage(to, envelope as unknown as object);
    } else {
      await browser.runtime.sendMessage(envelope as unknown as object);
    }
  }

  function sendRpcResponse(to: Endpoint, id: string, payload: RpcResponse) {
    const envelope: Envelope<RpcResponse> = {
      __afm: true,
      kind: "response",
      from: context,
      to,
      id,
      payload,
    };
    sendEnvelope(to, envelope).catch(
      /* istanbul ignore next */
      () => {
        // Swallow send failures on response; the caller may have already timed out.
      }
    );
  }

  async function send<K extends keyof TMessageSchema>(
    type: K,
    payload: MessagePayload<TMessageSchema, K>,
    options?: SendOptions
  ): Promise<void> {
    const to = options?.to ?? defaultTo;
    if (to === undefined) {
      throw new Error(
        "[@addfox/message] `to` is required. Either pass it in `defineMessaging({ to })` or provide it per-send via `send(type, payload, { to })`."
      );
    }

    const envelope: Envelope<unknown> = {
      __afm: true,
      kind: "message",
      type: type as string,
      from: context,
      to,
      payload,
    };
    await sendEnvelope(to, envelope);
  }

  async function broadcast<K extends keyof TMessageSchema>(
    type: K,
    payload: MessagePayload<TMessageSchema, K>
  ): Promise<void> {
    const envelope: Envelope<unknown> = {
      __afm: true,
      kind: "message",
      type: type as string,
      from: context,
      to: BROADCAST_ENDPOINT,
      payload,
    };
    await sendEnvelope(BROADCAST_ENDPOINT, envelope);
  }

  function addHandler<K extends keyof TMessageSchema>(
    type: K,
    handler: MessageHandler<MessagePayload<TMessageSchema, K>>,
    options: OnOptions
  ): () => void {
    install();
    const key = type as string;
    if (!handlers.has(key)) {
      handlers.set(key, new Set());
    }
    const stored: StoredHandler = {
      handler: handler as MessageHandler<unknown>,
      options,
      once: options.once ?? false,
    };
    handlers.get(key)!.add(stored);
    return () => {
      handlers.get(key)?.delete(stored);
    };
  }

  function on<K extends keyof TMessageSchema>(
    type: K,
    handler: MessageHandler<MessagePayload<TMessageSchema, K>>,
    options?: OnOptions
  ): () => void {
    return addHandler(type, handler, { ...options, once: false });
  }

  function once<K extends keyof TMessageSchema>(
    type: K,
    handler: MessageHandler<MessagePayload<TMessageSchema, K>>,
    options?: Omit<OnOptions, "once">
  ): () => void {
    return addHandler(type, handler, { ...options, once: true });
  }

  function register<K extends keyof TRpcSchema>(
    method: K,
    handler: TRpcSchema[K]
  ): () => void {
    install();
    rpcHandlers.set(method as string, handler as (...params: any[]) => unknown);
    return () => {
      rpcHandlers.delete(method as string);
    };
  }

  function call<K extends keyof TRpcSchema>(
    to: Endpoint,
    method: K,
    params: Parameters<TRpcSchema[K]>,
    callOptions?: { timeout?: number }
  ): Promise<Awaited<ReturnType<TRpcSchema[K]>>> {
    install();
    const id = createMsgId();
    const envelope: Envelope<RpcRequest> = {
      __afm: true,
      kind: "request",
      from: context,
      to,
      id,
      payload: {
        method: method as string,
        params: (params ?? []) as unknown[],
      },
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(
          new Error(`RPC call to ${String(to)}::${String(method)} timed out`)
        );
      }, callOptions?.timeout ?? 10000);

      pending.set(id, {
        resolve: (response) => {
          clearTimeout(timer);
          if (response.error) {
            const err = new Error(response.error.message);
            if (response.error.code) {
              try {
                (err as any).code = response.error.code;
              } catch {
                // Ignore if the error object is frozen.
              }
            }
            reject(err);
          } else {
            resolve(response.result as Awaited<ReturnType<TRpcSchema[K]>>);
          }
        },
        reject,
        timer,
      });

      sendEnvelope(to, envelope).catch((err: unknown) => {
        clearTimeout(timer);
        pending.delete(id);
        reject(err);
      });
    });
  }

  install();

  return { send, broadcast, on, once, register, call };
}
