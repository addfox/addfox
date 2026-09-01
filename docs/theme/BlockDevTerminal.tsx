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
          <span className={termLine.value}>Addfox 0.2.7 with </span>
          <span className={termLine.purple}>Rsbuild 2.2.1</span>
        </div>
        <div className="block">
          <span className={termLine.rsbuild}>[Rsbuild] </span>
          <span className={termLine.value}>start   build started...</span>
        </div>
        <div className="block">
          <span className={termLine.rsbuild}>[Rsbuild] </span>
          <span className={termLine.value}>ready   built in </span>
          <span className={termLine.time}>0.62 s</span>
        </div>
        <div className="block">
          <span className={termLine.addfox}>[Addfox] </span>
          <span className={termLine.value}>Press r + enter to reload, o + enter to reopen browser (Ctrl-C to quit)</span>
        </div>
        <div className="block">
          <span className={termLine.value}>URLs</span>
        </div>
        <div className="block">
          <span className={termLine.value}>{`├── Dev server -> `}<span className={termLine.time}>http://localhost:3000</span></span>
        </div>
        <div className="block">
          <span className={termLine.value}>{`└── WebSocket -> `}<span className={termLine.time}>ws://127.0.0.1:23333</span></span>
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
