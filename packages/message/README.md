# @addfox/message

Lightweight typed messaging wrapper for browser extensions.

Works with any extension project by depending only on `@addfox/browser`.
It injects `from`/`to` metadata into every message and filters incoming
traffic so handlers only receive what they asked for.

## Features

- Schema-typed `send` / `on` API with `from`/`to` filtering.
- Type-safe RPC request/response via `call` / `register`.
- One-time listeners with `once`.
- Broadcast to every listening context with `broadcast`.
- Optional long-lived port channel via `createPortChannel`.
- No dependency on addfox core.

## Usage

```ts
import { defineMessaging } from "@addfox/message";

interface Schema {
  ping: { payload: { data: string } };
  update: { payload: { count: number } };
}

interface MyRpc {
  add(a: number, b: number): number;
}

const bus = defineMessaging<Schema, MyRpc>({
  context: "background",
  to: "popup",
});

// One-way message
bus.send("ping", { data: "hello" });

// Broadcast to every context listening for "update"
bus.broadcast("update", { count: 5 });

// Filtered listener
bus.on("update", (payload, ctx) => {
  console.log(ctx.from, payload);
});

// Listen only from content scripts
bus.on("ping", (payload) => console.log(payload), { from: "content" });

// One-time listener
bus.once("ping", (payload) => console.log("first:", payload));

// RPC
bus.register("add", (a, b) => a + b);
const result = await bus.call("background", "add", [1, 2]);
```

## API

### `defineMessaging<TMessageSchema, TRpcSchema>(options)`

Creates a typed messaging bus.

- `context` – local endpoint id. Falls back to `__addfox__?.context`.
- `to` – default target endpoint for `send()`.
- `browser` – optional `Browser` instance for testing.

### `bus.send(type, payload, options?)`

Sends a one-way typed message. `options.to` overrides the default target.

### `bus.broadcast(type, payload)`

Sends a one-way message to every listening context (endpoint `"*"`).

### `bus.on(type, handler, options?)`

Registers a typed message handler. Options:

- `from` – only handle messages from this endpoint (or array of endpoints).
- `once` – remove the handler after the first matching message.

Returns an unsubscribe function.

### `bus.once(type, handler, options?)`

Convenience shorthand for `on` with `{ once: true }`.

### `bus.register(method, handler)`

Registers an RPC method handler. With a `TRpcSchema`, the method name, params
and return type are type-checked.

### `bus.call(to, method, params, options?)`

Calls a remote RPC method and returns a promise of its result. Rejects if the
handler throws or if the call times out (default 10s). Unknown methods now
reject immediately with a `METHOD_NOT_FOUND` error instead of hanging.

### `createPortChannel(options)`

Creates a long-lived `runtime.connect` channel.

- `from` / `to` – endpoints used for filtering.
- `name` – optional port name.
- `onDisconnect` – optional callback when the port disconnects.

Provides `post`, `on`, `disconnect`, and `isConnected`.

## Error codes

RPC rejections may include one of these codes on the error object:

- `METHOD_NOT_FOUND` – the remote endpoint has no handler for the method.
- `HANDLER_ERROR` – the remote handler threw.

Timeouts and transport failures reject with a plain `Error`.
