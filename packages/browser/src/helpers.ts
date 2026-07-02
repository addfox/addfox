export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

export function isFunction(value: unknown): value is (...args: any[]) => any {
  return typeof value === "function";
}

export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return isObject(value) && isFunction(value.then);
}

export function hasLastArgCallback(fn: (...args: any[]) => any): boolean {
  try {
    const source = fn.toString();
    return /callback|cb/i.test(source);
  } catch {
    return true;
  }
}

export function isEventLike(value: unknown): value is chrome.events.Event<any> {
  return (
    isObject(value) &&
    isFunction(value.addListener) &&
    isFunction(value.removeListener) &&
    isFunction(value.hasListener)
  );
}
