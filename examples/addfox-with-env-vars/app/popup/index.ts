import { collectEnvProbe, formatEnvProbe } from "../envProbe";

const outputEl = document.getElementById("output");
const message = formatEnvProbe("[popup]");

if (outputEl) {
  outputEl.textContent = message;
}

console.log(message);

chrome.runtime.sendMessage({ type: "ENV_PROBE", payload: collectEnvProbe() });
