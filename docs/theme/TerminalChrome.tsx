import React from "react";

export function TerminalChrome({ shell = "bash" }: { shell?: string }) {
  return (
    <div className="flex items-center justify-between py-2 px-4 bg-[var(--addfox-term-bar-bg)] border-b border-[var(--addfox-term-border)]">
      <div className="flex gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
      </div>
      <span className="text-xs text-[var(--addfox-term-prompt)] font-mono">{shell}</span>
    </div>
  );
}
