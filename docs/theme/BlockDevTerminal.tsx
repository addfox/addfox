import React from "react";
import { TerminalChrome } from "./TerminalChrome";
import { termBox, termBody, termLine } from "./terminalStyles";

export function BlockDevTerminal() {
  return (
    <div className={termBox}>
      <TerminalChrome />
      <div className={termBody}>
        <div className="block">
          <span className={termLine.prompt}>$ addfox dev</span>
        </div>
        <div className="block">
          <span className={termLine.addfox}>[Addfox] </span>
          <span className={termLine.value}>Addfox 0.1.1-beta.11 with </span>
          <span className={termLine.purple}>Rsbuild 1.7.3</span>
        </div>
        <div className="block">
          <span className={termLine.addfox}>[Addfox] </span>
          <span className={termLine.done}>● </span>
          <span className={termLine.value}>Parse config </span>
          <span className={termLine.time}>84ms</span>
        </div>
        <div className="block">
          <span className={termLine.purple}>Entry</span>
        </div>
        <div className="block">
          <span className={termLine.value}>{`├── `}<span className={termLine.purple}>background</span>{` -> app/background/index.ts`}</span>
        </div>
        <div className="block">
          <span className={termLine.value}>{`├── `}<span className={termLine.purple}>content</span>{` -> app/content/index.ts`}</span>
        </div>
        <div className="block">
          <span className={termLine.value}>{`├── `}<span className={termLine.purple}>popup</span>{` -> app/popup/index.tsx`}</span>
        </div>
        <div className="block">
          <span className={termLine.value}>{`└── `}<span className={termLine.purple}>options</span>{` -> app/options/index.tsx`}</span>
        </div>
        <div className="block">
          <span className={termLine.addfox}>[Addfox] </span>
          <span className={termLine.done}>● </span>
          <span className={termLine.value}>Rsbuild ready </span>
          <span className={termLine.time}>6ms</span>
        </div>
        <div className="block">
          <span className={termLine.addfox}>[Addfox] </span>
          <span className={termLine.done}>● </span>
          <span className={termLine.value}>Hot reload WebSocket: ws://127.0.0.1:23333 </span>
          <span className={termLine.time}>31ms</span>
        </div>
        <div className="block">
          <span className={termLine.rsbuild}>[Rsbuild] </span>
          <span className={termLine.value}>start   build started...</span>
        </div>
        <div className="block">
          <span className={termLine.addfox}>[Addfox] </span>
          <span className={termLine.done}>● </span>
          <span className={termLine.value}>Dev server http://198.18.0.1:3000 </span>
          <span className={termLine.time}>297ms</span>
        </div>
        <div className="block">
          <span className={termLine.rsbuild}>[Rsbuild] </span>
          <span className={termLine.value}>ready   built in </span>
          <span className={termLine.time}>0.62 s</span>
        </div>
        <div className="block">
          <span className={termLine.addfox}>[Addfox] </span>
          <span className={termLine.value}>Press R to reload extension (and Ctrl-C to quit)</span>
        </div>
        <div className="block">
          <span className={termLine.addfox}>[Addfox] </span>
          <span className={termLine.done}>● </span>
          <span className={termLine.value}>chrome started, extensions loaded. </span>
          <span className={termLine.time}>300ms</span>
        </div>
        <div className="block">
          <span className={termLine.addfox}>[Addfox] </span>
          <span className={termLine.done}>● </span>
          <span className={termLine.value}>Extension size: </span>
          <span className={termLine.cyan}>2.21 MB</span>
          {/* <span className={termLine.value}> (with inline-source-map, vendor excluded)</span> */}
        </div>
      </div>
    </div>
  );
}
