import React from "react";
import { TerminalChrome } from "./TerminalChrome";
import { termLine, termTable } from "./terminalStyles";

export const HERO_TERMINAL_LINE_COUNT = 9;
const LINE_INTERVAL_MS = 240;
const BROWSER_VISIBLE_MS = 2600;
const PAUSE_AFTER_BROWSER_MS = 1000;

function HeroTerminalBody({
  visibleCount,
  bodyRef,
}: {
  visibleCount: number;
  bodyRef: React.RefObject<HTMLDivElement | null>;
}) {
  const row = (index: number, content: React.ReactNode, isTableRow = false) => {
    const visible = index < visibleCount;
    return (
      <div
        key={index}
        className={`block transition-all duration-200 ease-out ${
          visible ? "opacity-100 " + (isTableRow ? "max-h-[14em]" : "max-h-[4em]") : "opacity-0 max-h-0 overflow-hidden"
        }`}
      >
        {content}
      </div>
    );
  };
  return (
    <div className="p-4 pl-5 font-mono text-[0.8125rem] leading-[1.7] whitespace-pre-wrap break-all" ref={bodyRef}>
      {row(0, <span className={termLine.prompt}>$ addfox dev</span>)}
      {row(1, (
        <>
          <span className={termLine.addfox}>[Addfox] </span>
          <span className={termLine.value}>0.0.1 with </span>
          <span className={termLine.purple}>Rsbuild 0.4.x</span>
        </>
      ))}
      {row(2, (
        <>
          <span className={termLine.addfox}>[Addfox] </span>
          <span className={termLine.done}>● </span>
          <span className={termLine.value}>Parse config </span>
          <span className={termLine.time}>25ms</span>
        </>
      ))}
      {row(3, (
        <table className={termTable}>
          <thead>
            <tr>
              <th>Entry</th>
              <th>File</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>background</td><td>app/background.ts</td></tr>
            <tr><td>content</td><td>app/content/index.ts</td></tr>
            <tr><td>popup</td><td>app/popup/index.tsx</td></tr>
          </tbody>
        </table>
      ), true)}
      {row(4, (
        <>
          <span className={termLine.addfox}>[Addfox] </span>
          <span className={termLine.done}>● </span>
          <span className={termLine.value}>Rsbuild ready </span>
          <span className={termLine.time}>136ms</span>
        </>
      ))}
      {row(5, (
        <>
          <span className={termLine.rsbuild}>[Rsbuild] </span>
          <span className={termLine.value}>start   building app\content\index.ts</span>
        </>
      ))}
      {row(6, (
        <>
          <span className={termLine.rsbuild}>[Rsbuild] </span>
          <span className={termLine.value}>ready   built in </span>
          <span className={termLine.time}>0.08 s</span>
        </>
      ))}
      {row(7, (
        <>
          <span className={termLine.addfox}>[Addfox] </span>
          <span className={termLine.done}>● </span>
          <span className={termLine.value}>Dev server http://localhost:3000 </span>
          <span className={termLine.time}>2ms</span>
        </>
      ))}
      {row(8, (
        <>
          <span className={termLine.addfox}>[Addfox] </span>
          <span className={termLine.done}>● </span>
          <span className={termLine.value}>Extension size: </span>
          <span className={termLine.cyan}>1.24 MB</span>
        </>
      ))}
    </div>
  );
}

function BrowserWindow({ show }: { show: boolean }) {
  return (
    <div
      className={`absolute left-0 top-full w-[500px] h-[340px] rounded-xl overflow-hidden flex flex-col bg-[var(--addfox-home-block-bg)] shadow-[0_16px_48px_rgba(0,0,0,0.22),0_0_0_1px_var(--addfox-home-border)] dark:shadow-[0_20px_56px_rgba(0,0,0,0.5),0_0_0_1px_var(--addfox-home-border)] pointer-events-none z-10 transition-all duration-300 ease-out ${
        show
          ? "opacity-100 scale-100 [transform:translate(-16%,-85%)]"
          : "opacity-0 scale-[0.94] [transform:translate(-16%,calc(-85%+0.5rem))]"
      }`}
    >
      <div className="flex items-center gap-2 py-1.5 px-2.5 bg-[var(--addfox-term-bar-bg)] border-b border-[var(--addfox-term-border)] shrink-0 min-h-9">
        <div className="flex gap-1 shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#ff5f56]" />
          <span className="w-2 h-2 rounded-full bg-[#ffbd2e]" />
          <span className="w-2 h-2 rounded-full bg-[#27c93f]" />
        </div>
        <div className="flex-1 min-w-0 text-[0.7rem] text-[var(--addfox-term-prompt)] font-mono whitespace-nowrap overflow-hidden text-ellipsis">
          <span className="mr-1">🔒</span>
          chrome-extension://.../welcome.html
        </div>
        <div className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--addfox-home-muted)] shrink-0" title="Extension">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2v4h4a2 2 0 0 1 2 2v4h4a2 2 0 0 1-2 2h-4v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h4V2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-[var(--addfox-term-bg)] border border-[var(--addfox-term-border)] border-t-0 px-4 py-5">
        <h2 className="text-[1.125rem] font-bold text-[var(--addfox-home-text)] m-0 mb-2 text-center">
          Addfox + React
        </h2>
        <p className="text-[0.875rem] text-[var(--addfox-home-muted)] m-0 text-center">
          Your extension is ready. Happy building!
        </p>
      </div>
    </div>
  );
}

export function HeroTerminalWithAnimation() {
  const [visibleCount, setVisibleCount] = React.useState(0);
  const [showBrowser, setShowBrowser] = React.useState(false);
  const timersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);

  function clearAllTimers() {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  React.useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [visibleCount]);

  React.useEffect(() => {
    function runLinePhase() {
      setVisibleCount(0);
      setShowBrowser(false);
      let count = 0;
      intervalRef.current = setInterval(() => {
        count += 1;
        setVisibleCount(count);
        if (count >= HERO_TERMINAL_LINE_COUNT) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setShowBrowser(true);
          const t2 = setTimeout(() => {
            setShowBrowser(false);
            const t3 = setTimeout(runLinePhase, PAUSE_AFTER_BROWSER_MS);
            timersRef.current.push(t3);
          }, BROWSER_VISIBLE_MS);
          timersRef.current.push(t2);
        }
      }, LINE_INTERVAL_MS);
    }
    runLinePhase();
    return clearAllTimers;
  }, []);

  return (
    <div className="relative flex flex-col items-start w-full">
      <div className="addfox-term-glass h-[400px] w-full min-w-0 flex flex-col border border-[var(--addfox-term-border)] rounded-xl overflow-hidden shadow-[var(--addfox-term-shadow)] transition-all duration-300 hover:shadow-[0_0_40px_-10px_rgba(249,115,22,0.3)]">
        <TerminalChrome />
        <div className="addfox-terminal-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <HeroTerminalBody visibleCount={visibleCount} bodyRef={bodyRef} />
        </div>
      </div>
      <BrowserWindow show={showBrowser} />
    </div>
  );
}

export function HeroTerminal() {
  return (
    <div className="addfox-term-glass border border-[var(--addfox-term-border)] rounded-lg overflow-hidden shadow-[var(--addfox-term-shadow)]">
      <TerminalChrome />
      <HeroTerminalBody visibleCount={HERO_TERMINAL_LINE_COUNT} bodyRef={{ current: null }} />
    </div>
  );
}
