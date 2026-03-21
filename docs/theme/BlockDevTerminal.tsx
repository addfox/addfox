import React from "react";
import { TerminalChrome } from "./TerminalChrome";
import { termBox, termBody, termLine, termTable } from "./terminalStyles";

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
          <span className={termLine.done}>● </span>
          <span className={termLine.value}>Parse config </span>
          <span className={termLine.time}>25ms</span>
        </div>
        <div className="block">
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
        </div>
        <div className="block">
          <span className={termLine.addfox}>[Addfox] </span>
          <span className={termLine.done}>● </span>
          <span className={termLine.value}>Rsbuild ready </span>
          <span className={termLine.time}>136ms</span>
        </div>
        <div className="block">
          <span className={termLine.addfox}>[Addfox] </span>
          <span className={termLine.done}>● </span>
          <span className={termLine.value}>Dev server http://localhost:8080 </span>
          <span className={termLine.time}>890ms</span>
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
