import type { Browser } from "@addfox/browser";

/** An endpoint may be a logical name or a tab id. */
export type Endpoint = string | number;

/** Internal marker used to recognize library messages. */
export const MSG_MARKER = "__afm" as const;

/** Special endpoint that targets every listening context. */
export const BROADCAST_ENDPOINT = "*" as const;

/** Kind of envelope carried by the messaging bus. */
export type EnvelopeKind = "message" | "request" | "response";

/** Message envelope injected with routing metadata. */
export interface Envelope<P = unknown> {
  [MSG_MARKER]: true;
  kind: EnvelopeKind;
  /** Message type – present on bus messages, optional on port messages. */
  type?: string;
  /** Sender endpoint identifier (automatically injected). */
  from: string;
  /** Target endpoint identifier. */
  to: Endpoint;
  id?: string;
  payload: P;
}

/** User-defined message schema. */
export interface MessageSchema {
  [type: string]: {
    payload?: unknown;
  };
}

/** User-defined RPC schema: method name → handler signature. */
export interface RpcSchema {
  [method: string]: (...params: any[]) => any;
}

/** Options passed to `send()`. */
export interface SendOptions {
  /** Override the default target endpoint. */
  to?: Endpoint;
}

/** Options passed to `on()` and `once()`. */
export interface OnOptions {
  /** Only receive messages from these endpoints. */
  from?: Endpoint | Endpoint[];
  /** Remove the handler after the first matching message. */
  once?: boolean;
}

/** Context passed to every message handler. */
export interface HandlerContext {
  /** Sender endpoint identifier. */
  from: string;
  /** Target endpoint identifier. */
  to: Endpoint;
  /** Sender tab id (available when the message originates from a content script). */
  tabId?: number;
  /** Correlation id for RPC calls. */
  id?: string;
}

/** User-provided message handler. */
export type MessageHandler<P = unknown> = (
  payload: P,
  ctx: HandlerContext
) => void | Promise<void>;

/** RPC request payload. */
export interface RpcRequest {
  method: string;
  params: unknown[];
}

/** Standard RPC error codes. */
export const RpcErrorCode = {
  MethodNotFound: "METHOD_NOT_FOUND",
  HandlerError: "HANDLER_ERROR",
  Timeout: "TIMEOUT",
  SendFailed: "SEND_FAILED",
} as const;

/** Structured RPC error. */
export interface RpcError {
  message: string;
  code?: string;
}

/** RPC response payload. */
export interface RpcResponse {
  result?: unknown;
  error?: RpcError;
}

/** Options passed to `defineMessaging()`. */
export interface MessagingOptions {
  /** Local endpoint identifier. Falls back to `__addfox__?.context` then throws. */
  context?: string;
  /** Default target endpoint for `send()`. */
  to?: Endpoint;
  /** Optional browser object; defaults to the global `browser`. */
  browser?: Browser;
}

/** Extract the payload type for a message type from the schema. */
export type MessagePayload<
  Schema extends MessageSchema,
  K extends keyof Schema,
> = Schema[K] extends { payload: infer P } ? P : unknown;

/** Public API of a typed messaging layer. */
export interface Messaging<
  TMessageSchema extends MessageSchema = MessageSchema,
  TRpcSchema extends RpcSchema = RpcSchema,
> {
  /** Send a one-way message. */
  send<K extends keyof TMessageSchema>(
    type: K,
    payload: MessagePayload<TMessageSchema, K>,
    options?: SendOptions
  ): Promise<void>;

  /** Broadcast a one-way message to every listening context. */
  broadcast<K extends keyof TMessageSchema>(
    type: K,
    payload: MessagePayload<TMessageSchema, K>
  ): Promise<void>;

  /** Register a handler for a specific message type. */
  on<K extends keyof TMessageSchema>(
    type: K,
    handler: MessageHandler<MessagePayload<TMessageSchema, K>>,
    options?: OnOptions
  ): () => void;

  /** Register a one-time handler for a specific message type. */
  once<K extends keyof TMessageSchema>(
    type: K,
    handler: MessageHandler<MessagePayload<TMessageSchema, K>>,
    options?: Omit<OnOptions, "once">
  ): () => void;

  /** Register an RPC method handler. */
  register<K extends keyof TRpcSchema>(
    method: K,
    handler: TRpcSchema[K]
  ): () => void;

  /** Call an RPC method on a remote endpoint and await the response. */
  call<K extends keyof TRpcSchema>(
    to: Endpoint,
    method: K,
    params: Parameters<TRpcSchema[K]>,
    options?: { timeout?: number }
  ): Promise<Awaited<ReturnType<TRpcSchema[K]>>>;
}

/** Options passed to `createPortChannel()`. */
export interface PortChannelOptions {
  /** Local endpoint identifier. */
  from: string;
  /** Remote endpoint identifier used for filtering incoming messages. */
  to: Endpoint;
  /** Optional port name passed to `runtime.connect`. */
  name?: string;
  /** Optional browser object; defaults to the global `browser`. */
  browser?: Browser;
  /** Optional callback invoked when the port disconnects. */
  onDisconnect?: () => void;
}

/** Public API of a port-based channel. */
export interface PortChannel {
  /** Post a payload through the port. */
  post<P>(payload: P): void;
  /** Listen to incoming port messages. */
  on<P>(handler: MessageHandler<P>): () => void;
  /** Disconnect the underlying port. */
  disconnect(): void;
  /** Whether the underlying port is still connected. */
  isConnected(): boolean;
}
