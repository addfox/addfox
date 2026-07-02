/**
 * @addfox/message
 *
 * Lightweight typed messaging for browser extensions.
 * Eliminates boilerplate switch-cases by routing messages through
 * schema-typed `send` / `on` pairs and type-safe RPC via `register` / `call`.
 */

export { defineMessaging } from "./bus.js";
export { createPortChannel } from "./port.js";
export { createMsgId } from "./id.js";
export { isEnvelope } from "./helpers.js";
export { MSG_MARKER, BROADCAST_ENDPOINT, RpcErrorCode } from "./types.js";
export type {
  Endpoint,
  Envelope,
  EnvelopeKind,
  SendOptions,
  OnOptions,
  HandlerContext,
  MessageHandler,
  MessageSchema,
  MessagePayload,
  RpcSchema,
  Messaging,
  PortChannel,
  PortChannelOptions,
  RpcRequest,
  RpcResponse,
  RpcError,
  MessagingOptions,
} from "./types.js";
