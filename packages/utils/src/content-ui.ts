/**
 * Content UI helpers for extension content scripts: define and mount a root element
 * (optionally inside iframe or shadow DOM) into a page target.
 *
 * Usage:
 *   import { defineShadowContentUI } from "@addfox/utils";
 *   const mount = defineShadowContentUI({ name: "my-content-ui", target: "body" });
 *   const root = mount();
 *   root.appendChild(myContent);
 */

export type ContentUIWrapper = "iframe" | "shadow" | "none";
export type ContentUIInjectMode = "append" | "prepend";
const CONTENT_CSS_GLOBAL_KEY = "__ADDFOX_CONTENT_CSS_FILES__";
const CONTENT_CSS_TEXTS_GLOBAL_KEY = "__ADDFOX_CONTENT_CSS_TEXTS__";
const DEFAULT_SHADOW_COMPONENT_NAME = "addfox-content-ui";
const contentCssTargets = new WeakSet<Node>();

export interface DefineContentUIBaseOptions {
  /** Mount target: CSS selector (document.querySelector) or an Element */
  target: string | Element;
  /** Element attributes (id, class, style, data-*, etc.) */
  attr?: Record<string, string>;
  /**
   * How to insert relative to target: append or prepend.
   * When wrapper is used (iframe/shadow), the wrapper element is also inserted into the target according to this mode.
   */
  injectMode?: ContentUIInjectMode;
}

export interface DefineContentUIOptions extends DefineContentUIBaseOptions {
  /** Element tag name, e.g. "div", "section" */
  tag: string;
}

export interface DefineShadowContentUIOptions extends DefineContentUIBaseOptions {
  /** Custom element name for shadow host, e.g. "my-content-ui". */
  name: string;
}

export interface DefineIframeContentUIOptions extends DefineContentUIBaseOptions {
}

const CONTENT_UI_SPEC = Symbol.for("@addfox/utils/content-ui-spec");

export interface ContentUISpecBrand {
  readonly [CONTENT_UI_SPEC]: true;
}

export type NativeContentUISpec = DefineContentUIOptions & {
  wrapper: "none";
};

export type ShadowContentUISpec = DefineShadowContentUIOptions & {
  wrapper: "shadow";
};

export type IframeContentUISpec = DefineIframeContentUIOptions & {
  wrapper: "iframe";
};

export type ContentUISpec = (
  | NativeContentUISpec
  | ShadowContentUISpec
  | IframeContentUISpec
) & ContentUISpecBrand;

export type ContentUIMount = () => Element | ShadowRoot;

/**
 * Defines a content UI spec. Use the return value with mountContentUI() when you want to mount.
 */
function createSpec<T extends NativeContentUISpec | ShadowContentUISpec | IframeContentUISpec>(
  options: T
): ContentUISpec {
  const spec = {
    ...options,
    injectMode: options.injectMode ?? "append" as ContentUIInjectMode,
    [CONTENT_UI_SPEC]: true as const,
  };
  return spec as ContentUISpec;
}

export function defineContentUI(
  options: DefineContentUIOptions
): ContentUIMount {
  const spec = createSpec({
    ...options,
    wrapper: "none",
  });
  return () => mountContentUIInternal(spec);
}

export function defineShadowContentUI(
  options: DefineShadowContentUIOptions
): ContentUIMount {
  const spec = createSpec({
    ...options,
    wrapper: "shadow",
  });
  return () => mountContentUIInternal(spec);
}

export function defineIframeContentUI(
  options: DefineIframeContentUIOptions
): ContentUIMount {
  const spec = createSpec({
    ...options,
    wrapper: "iframe",
  });
  return () => mountContentUIInternal(spec);
}

function resolveTarget(target: string | Element): Element | null {
  if (typeof target === "string") {
    return document.querySelector(target);
  }
  return target;
}

/** Apply attrs to host element (the node inserted into target) in all modes. */
function applyHostAttrs(
  el: Element,
  attr: Record<string, string> | undefined
): void {
  if (!attr) return;
  for (const [key, value] of Object.entries(attr)) {
    if (key === "style" && typeof value === "string") {
      (el as HTMLElement).style.cssText = value;
    } else {
      el.setAttribute(key, value);
    }
  }
}

function injectChild(
  container: Element,
  child: Element,
  mode: ContentUIInjectMode
): void {
  if (mode === "prepend") {
    container.insertBefore(child, container.firstChild);
  } else {
    container.appendChild(child);
  }
}

function isValidCustomElementName(name: string): boolean {
  if (!name.includes("-")) return false;
  return /^[a-z][a-z0-9._-]*-[a-z0-9._-]*$/.test(name);
}

function normalizeShadowComponentName(name: string | undefined): string {
  const normalized = (name ?? DEFAULT_SHADOW_COMPONENT_NAME).trim().toLowerCase();
  if (isValidCustomElementName(normalized)) return normalized;
  return DEFAULT_SHADOW_COMPONENT_NAME;
}

function getCustomElementsRegistry():
  | { get: (name: string) => unknown; define: (name: string, ctor: CustomElementConstructor) => void }
  | null {
  const g = globalThis as { customElements?: unknown };
  const registry = g.customElements;
  if (!registry || typeof registry !== "object") return null;
  const maybeGet = (registry as { get?: unknown }).get;
  const maybeDefine = (registry as { define?: unknown }).define;
  if (typeof maybeGet !== "function" || typeof maybeDefine !== "function") return null;
  return registry as {
    get: (name: string) => unknown;
    define: (name: string, ctor: CustomElementConstructor) => void;
  };
}

function ensureCustomElementDefined(tag: string): boolean {
  const registry = getCustomElementsRegistry();
  if (!registry) return false;
  if (registry.get(tag)) return true;
  class AddfoxShadowElement extends HTMLElement {}
  registry.define(tag, AddfoxShadowElement);
  return true;
}

function getRuntimeUrl(path: string): string {
  const value = path.replace(/\\/g, "/");
  const g = globalThis as {
    chrome?: { runtime?: { getURL?: (p: string) => string } };
    browser?: { runtime?: { getURL?: (p: string) => string } };
  };
  const chromeUrl = g.chrome?.runtime?.getURL;
  if (typeof chromeUrl === "function") return chromeUrl(value);
  const browserUrl = g.browser?.runtime?.getURL;
  if (typeof browserUrl === "function") return browserUrl(value);
  return value;
}

function readContentCssFilesFromGlobal(): string[] {
  const g = globalThis as { [CONTENT_CSS_GLOBAL_KEY]?: unknown };
  const list = g[CONTENT_CSS_GLOBAL_KEY];
  if (!Array.isArray(list)) return [];
  return list.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function readContentCssTextsFromGlobal(): string[] {
  const g = globalThis as { [CONTENT_CSS_TEXTS_GLOBAL_KEY]?: unknown };
  const list = g[CONTENT_CSS_TEXTS_GLOBAL_KEY];
  if (!Array.isArray(list)) return [];
  return list.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function injectCssIntoNode(
  targetNode: Node,
  createStyleEl: () => HTMLStyleElement
): void {
  if (contentCssTargets.has(targetNode)) return;
  contentCssTargets.add(targetNode);
  const cssTexts = readContentCssTextsFromGlobal();
  if (cssTexts.length > 0) {
    for (const cssText of cssTexts) {
      const style = createStyleEl();
      style.textContent = cssText;
    }
    return;
  }

  const files = readContentCssFilesFromGlobal();
  if (files.length === 0) return;

  for (const rel of files) {
    const url = getRuntimeUrl(rel);
    void fetch(url)
      .then((res) => (res.ok ? res.text() : ""))
      .then((cssText) => {
        if (!cssText) return;
        const style = createStyleEl();
        style.textContent = cssText;
      })
      .catch(() => {
        // ignore css fetch errors
      });
  }
}

function injectCssIntoShadowHead(
  shadow: ShadowRoot,
  head: HTMLElement
): void {
  injectCssIntoNode(shadow, () => {
    const style = document.createElement("style");
    head.appendChild(style);
    return style;
  });
}

function ensureIframeHead(doc: Document): HTMLHeadElement {
  if (doc.head) return doc.head;
  const head = doc.createElement("head");
  const html = doc.documentElement ?? doc.createElement("html");
  if (!doc.documentElement) doc.appendChild(html);
  html.insertBefore(head, html.firstChild);
  return head;
}

function injectCssIntoIframeHead(doc: Document): void {
  const head = ensureIframeHead(doc);
  injectCssIntoNode(doc, () => {
    const style = doc.createElement("style");
    head.appendChild(style);
    return style;
  });
}

function mountNone(spec: NativeContentUISpec, container: Element): Element {
  const el = document.createElement(spec.tag);
  applyHostAttrs(el, spec.attr);
  injectChild(container, el, spec.injectMode ?? "append");
  return el;
}

function mountShadow(spec: ShadowContentUISpec, container: Element): HTMLElement {
  const hostTag = normalizeShadowComponentName(spec.name);
  // Always create host with custom tag name.
  // Try to define it when registry is available, but never fallback to div.
  try {
    ensureCustomElementDefined(hostTag);
  } catch {
    // ignore define errors; host tag still keeps the custom element name
  }
  const host = document.createElement(hostTag);
  applyHostAttrs(host, spec.attr);
  const shadow = host.attachShadow({ mode: "open" });
  const html = document.createElement("html");
  const head = document.createElement("head");
  const body = document.createElement("body");
  const mountNode = document.createElement("div");
  mountNode.setAttribute("data-addfox-shadow-root", "true");
  html.appendChild(head);
  body.appendChild(mountNode);
  html.appendChild(body);
  shadow.appendChild(html);
  injectCssIntoShadowHead(shadow, head);
  // wrapper (host) is inserted into target according to injectMode
  injectChild(container, host, spec.injectMode ?? "append");
  return mountNode;
}

function mountIframe(spec: IframeContentUISpec, container: Element): HTMLElement {
  const iframe = document.createElement("iframe");
  applyHostAttrs(iframe, spec.attr);
  // wrapper (iframe) is inserted into target according to injectMode
  injectChild(container, iframe, spec.injectMode ?? "append");
  const doc = iframe.contentDocument;
  if (!doc) throw new Error("content-ui: iframe contentDocument not available");
  injectCssIntoIframeHead(doc);
  const root = document.createElement("div");
  doc.body.appendChild(root);
  return root;
}

function mountContentUIInternal(spec: ContentUISpec): Element | ShadowRoot {
  const container = resolveTarget(spec.target);
  if (!container) {
    throw new Error(
      `content-ui: target not found (${
        typeof spec.target === "string" ? spec.target : "Element"
      })`
    );
  }
  switch (spec.wrapper) {
    case "shadow":
      return mountShadow(spec as ShadowContentUISpec, container);
    case "iframe":
      return mountIframe(spec as IframeContentUISpec, container);
    default:
      return mountNone(spec as NativeContentUISpec, container);
  }
}
