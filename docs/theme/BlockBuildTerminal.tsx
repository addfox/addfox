import React from "react";
import { TerminalChrome } from "./TerminalChrome";
import { termBox, termBody, termLine } from "./terminalStyles";

export function BlockBuildTerminal() {
  return (
    <div className={termBox}>
      <TerminalChrome />
      <div className={termBody}>
        <div className="block">
          <span className={termLine.prompt}>$ addfox build</span>
        </div>
        <div className="block">
          <span className={termLine.addfox}>[Addfox] </span>
          <span className={termLine.value}>Addfox 0.2.7 with </span>
          <span className={termLine.purple}>Rsbuild 2.1.13</span>
        </div>
        <div className="block">
          <span className={termLine.rsbuild}>[Rsbuild] </span>
          <span className={termLine.value}>ready   built in </span>
          <span className={termLine.time}>2.1 s</span>
        </div>
        <div className="block">
          <span className={termLine.addfox}>[Addfox] </span>
          <span className={termLine.done}>● </span>
          <span className={termLine.value}>Rsbuild build </span>
          <span className={termLine.time}>2.1s</span>
        </div>
        <div className="block">
          <span className={termLine.addfox}>[Addfox] </span>
          <span className={termLine.done}>● </span>
          <span className={termLine.value}>Zipped output to </span>
          <span className={termLine.cyan}>dist/addfox-0.2.0.zip</span>
        </div>
        <div className="block">
          <span className={termLine.addfox}>[Addfox] </span>
          <span className={termLine.done}>● </span>
          <span className={termLine.value}>Extension size: </span>
          <span className={termLine.cyan}>1.24 MB</span>
        </div>
      </div>
    </div>
  );
}
