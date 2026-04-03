import React from "react";
import { TerminalChrome } from "./TerminalChrome";
import { termLine } from "./terminalStyles";

export const HERO_TERMINAL_LINE_COUNT = 8;
const LINE_INTERVAL_MS = 120;
const BROWSER_VISIBLE_MS = 2600;
const PAUSE_AFTER_BROWSER_MS = 1000;

function HeroTerminalBody({
  visibleCount,
  bodyRef,
}: {
  visibleCount: number;
  bodyRef: React.RefObject<HTMLDivElement | null>;
}) {
  const row = (index: number, content: React.ReactNode, isTreeView = false) => {
    const visible = index < visibleCount;
    return (
      <div
        key={index}
        className={`block transition-all duration-200 ease-out ${
          visible ? (isTreeView ? "max-h-[7.5em]" : "max-h-[1.4em]") : "opacity-0 max-h-0 overflow-hidden"
        }`}
      >
        {content}
      </div>
    );
  };
  return (
    <div className="p-4 pl-5 font-mono text-[0.8125rem] leading-[1.4] whitespace-pre-wrap break-all" ref={bodyRef}>
      {row(0, <span className={termLine.prompt}>$ addfox dev</span>)}
      {row(1, (
        <>
          <span className={termLine.addfox}>[Addfox] </span>
          <span className={termLine.value}>Addfox 0.1.1-beta.11 with </span>
          <span className={termLine.purple}>Rsbuild 1.7.3</span>
        </>
      ))}
      {row(2, (
        <>
          <span className={termLine.addfox}>[Addfox] </span>
          <span className={termLine.done}>● </span>
          <span className={termLine.value}>Parse config </span>
          <span className={termLine.time}>84ms</span>
        </>
      ))}
      {/* Entry 树状结构整体出现 */}
      {row(3, (
        <div className="flex flex-col leading-[1.4]">
          <span className={termLine.purple}>Entry</span>
          <span className={termLine.value}>{`├── `}<span className={termLine.purple}>background</span>{` -> app/background/index.ts`}</span>
          <span className={termLine.value}>{`├── `}<span className={termLine.purple}>content</span>{` -> app/content/index.ts`}</span>
          <span className={termLine.value}>{`├── `}<span className={termLine.purple}>popup</span>{` -> app/popup/index.tsx`}</span>
          <span className={termLine.value}>{`└── `}<span className={termLine.purple}>options</span>{` -> app/options/index.tsx`}</span>
        </div>
      ), true)}
      {/* 每两行作为一个整体出现 */}
      {row(4, (
        <div className="flex flex-col leading-[1.4]">
          <span>
            <span className={termLine.addfox}>[Addfox] </span>
            <span className={termLine.done}>● </span>
            <span className={termLine.value}>Rsbuild ready </span>
            <span className={termLine.time}>6ms</span>
          </span>
          <span>
            <span className={termLine.addfox}>[Addfox] </span>
            <span className={termLine.done}>● </span>
            <span className={termLine.value}>Hot reload WebSocket: ws://127.0.0.1:23333 </span>
            <span className={termLine.time}>31ms</span>
          </span>
        </div>
      ), true)}
      {row(5, (
        <div className="flex flex-col leading-[1.4]">
          <span>
            <span className={termLine.rsbuild}>[Rsbuild] </span>
            <span className={termLine.value}>start   build started...</span>
          </span>
          <span>
            <span className={termLine.addfox}>[Addfox] </span>
            <span className={termLine.done}>● </span>
            <span className={termLine.value}>Dev server http://198.18.0.1:3000 </span>
            <span className={termLine.time}>297ms</span>
          </span>
        </div>
      ), true)}
      {row(6, (
        <div className="flex flex-col leading-[1.4]">
          <span>
            <span className={termLine.rsbuild}>[Rsbuild] </span>
            <span className={termLine.value}>ready   built in </span>
            <span className={termLine.time}>0.62 s</span>
          </span>
          <span>
            <span className={termLine.addfox}>[Addfox] </span>
            <span className={termLine.value}>Press R to reload extension (and Ctrl-C to quit)</span>
          </span>
        </div>
      ), true)}
      {row(7, (
        <div className="flex flex-col leading-[1.4]">
          <span>
            <span className={termLine.addfox}>[Addfox] </span>
            <span className={termLine.done}>● </span>
            <span className={termLine.value}>chrome started, extensions loaded. </span>
            <span className={termLine.time}>300ms</span>
          </span>
          <span>
            <span className={termLine.addfox}>[Addfox] </span>
            <span className={termLine.done}>● </span>
            <span className={termLine.value}>Extension size: </span>
            <span className={termLine.cyan}>2.21 MB</span>
          </span>
        </div>
      ), true)}
    </div>
  );
}

function BrowserWindow({ show }: { show: boolean }) {
  const [showPopup, setShowPopup] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [mousePhase, setMousePhase] = React.useState<'idle' | 'appear' | 'moving' | 'clicking' | 'done'>('idle');
  const [mousePos, setMousePos] = React.useState({ right: 80, top: 120 });

  // 模拟鼠标动画：弹窗出现后1秒开始
  React.useEffect(() => {
    if (!show) {
      setMousePhase('idle');
      setShowPopup(false);
      setMousePos({ right: 80, top: 120 });
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    
    // 1秒后出现鼠标
    timers.push(setTimeout(() => {
      setMousePhase('appear');
    }, 1000));

    // 短暂延迟后开始移动
    timers.push(setTimeout(() => {
      setMousePhase('moving');
      setMousePos({ right: 12, top: 8 }); // 目标位置：插件图标
    }, 1100));

    // 移动动画持续700ms后进入点击状态
    timers.push(setTimeout(() => {
      setMousePhase('clicking');
    }, 1800));

    // 点击后100ms弹出popup
    timers.push(setTimeout(() => {
      setShowPopup(true);
      setMousePhase('done');
    }, 1900));

    return () => timers.forEach(clearTimeout);
  }, [show]);

  return (
    <div
      className={`absolute left-0 top-full w-[500px] h-[340px] rounded-xl overflow-hidden flex flex-col bg-[var(--addfox-home-block-bg)] shadow-[0_16px_48px_rgba(0,0,0,0.22),0_0_0_1px_var(--addfox-home-border)] dark:shadow-[0_20px_56px_rgba(0,0,0,0.5),0_0_0_1px_var(--addfox-home-border)] z-10 transition-all duration-300 ease-out ${
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
        {/* Addfox Extension Icon */}
        <div 
          className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <button
            onClick={() => setShowPopup(!showPopup)}
            className={`w-7 h-7 flex items-center justify-center rounded-md shrink-0 transition-all duration-200 ${
              isHovered ? "scale-110" : ""
            }`}
            style={{ 
              background: isHovered ? "rgba(249, 115, 22, 0.15)" : "transparent",
            }}
            title="Addfox"
          >
            {/* Addfox Fox Icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {/* Fox head shape */}
              <path 
                d="M12 3L8 8H5L7 13L12 20L17 13L19 8H16L12 3Z" 
                fill="#F97316"
                stroke="#F97316"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              {/* Inner ears detail */}
              <path 
                d="M12 6L10 8H14L12 6Z" 
                fill="#FB923C"
              />
              {/* Eyes */}
              <circle cx="9.5" cy="11" r="1.2" fill="white"/>
              <circle cx="14.5" cy="11" r="1.2" fill="white"/>
              {/* Nose */}
              <circle cx="12" cy="14" r="0.8" fill="#7C2D12"/>
            </svg>
          </button>
          
          {/* Popup Dropdown */}
          <div 
            className={`absolute right-0 top-full mt-2 w-56 rounded-lg shadow-lg border transition-all duration-200 overflow-hidden ${
              showPopup 
                ? "opacity-100 translate-y-0 pointer-events-auto" 
                : "opacity-0 -translate-y-2 pointer-events-none"
            }`}
            style={{
              background: "var(--addfox-home-block-bg)",
              borderColor: "var(--addfox-home-border)",
            }}
          >
            {/* Popup Header */}
            <div 
              className="px-3 py-2 border-b flex items-center gap-2"
              style={{ borderColor: "var(--addfox-home-border)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 3L8 8H5L7 13L12 20L17 13L19 8H16L12 3Z" fill="#F97316" stroke="#F97316" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M12 6L10 8H14L12 6Z" fill="#FB923C"/>
                <circle cx="9.5" cy="11" r="1.2" fill="white"/>
                <circle cx="14.5" cy="11" r="1.2" fill="white"/>
                <circle cx="12" cy="14" r="0.8" fill="#7C2D12"/>
              </svg>
              <span className="text-sm font-semibold" style={{ color: "var(--addfox-home-text)" }}>
                Addfox
              </span>
            </div>
            {/* Popup Content */}
            <div className="p-2">
              <div 
                className="px-3 py-2 rounded text-sm cursor-pointer transition-colors"
                style={{ 
                  color: "var(--addfox-home-muted)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(249, 115, 22, 0.1)";
                  e.currentTarget.style.color = "var(--addfox-home-text)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--addfox-home-muted)";
                }}
              >
                Popup Page
              </div>
              <div 
                className="px-3 py-2 rounded text-sm cursor-pointer transition-colors"
                style={{ 
                  color: "var(--addfox-home-muted)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(249, 115, 22, 0.1)";
                  e.currentTarget.style.color = "var(--addfox-home-text)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--addfox-home-muted)";
                }}
              >
                Options
              </div>
              <div 
                className="px-3 py-2 rounded text-sm cursor-pointer transition-colors"
                style={{ 
                  color: "var(--addfox-home-muted)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(249, 115, 22, 0.1)";
                  e.currentTarget.style.color = "var(--addfox-home-text)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--addfox-home-muted)";
                }}
              >
                Manage Extension
              </div>
            </div>
          </div>
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

      {/* 模拟鼠标光标动画 */}
      {mousePhase !== 'idle' && (
        <div
          className="absolute pointer-events-none z-50"
          style={{
            right: `${mousePos.right}px`,
            top: `${mousePos.top}px`,
            opacity: mousePhase === 'done' ? 0 : 1,
            transform: mousePhase === 'clicking' ? 'scale(0.85)' : 'scale(1)',
            transition: mousePhase === 'moving' 
              ? 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)' 
              : 'transform 0.1s ease, opacity 0.3s ease',
          }}
        >
          {/* 鼠标指针 SVG */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
            <path 
              d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z" 
              fill="white" 
              stroke="#1a1a1a" 
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
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
          // 终端动画完成后，延迟0.5s再弹出浏览器
          const t1 = setTimeout(() => {
            setShowBrowser(true);
            const t2 = setTimeout(() => {
              setShowBrowser(false);
              const t3 = setTimeout(runLinePhase, PAUSE_AFTER_BROWSER_MS);
              timersRef.current.push(t3);
            }, BROWSER_VISIBLE_MS);
            timersRef.current.push(t2);
          }, 500);
          timersRef.current.push(t1);
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
