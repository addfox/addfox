/**
 * Content script: defineContentUI from @addfox/utils,
 * then mount a React app with Tailwind CSS.
 */
import "./index.css";
import "./test.css";
import { createRoot } from "react-dom/client";
import { defineContentUI } from "@addfox/utils";

const mountContentUI = defineContentUI({
  tag: "div",
  target: "body",
  attr: {
    id: "addfox-content-ui-react-root",
    class: "fixed bottom-4 right-4 z-[2147483647] max-w-[320px]",
  },
  injectMode: "append",
});

function ContentApp() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
      <h2 className="mb-2 text-sm font-semibold text-slate-800">
        Content UI (React + Tailwind)
      </h2>
      <p className="text-xs text-slate-500">
        Mounted with defineContentUI from @addfox/utils.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="rounded bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
          onClick={() => window.alert("Hello from content script")}
        >
          Say Hi
        </button>
        <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
          Tailwind
        </span>
      </div>
    </div>
  );
}

function mountUI(): void {
  const container = mountContentUI();
  if (!(container instanceof Element)) return;
  const root = createRoot(container);
  root.render(<ContentApp />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountUI);
} else {
  mountUI();
}
