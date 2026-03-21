/** Subpath export: web-ext package `exports["./util/logger"]`. */
declare module "web-ext/util/logger" {
  export class ConsoleStream {
    write(jsonString: string, options?: { localProcess?: typeof process }): void;
  }
  export const consoleStream: ConsoleStream;
}
