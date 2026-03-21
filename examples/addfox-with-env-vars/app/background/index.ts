import { collectEnvProbe, formatEnvProbe } from "../envProbe";

console.log(formatEnvProbe("[background:init]"));

chrome.runtime.onInstalled.addListener(() => {
  console.log(formatEnvProbe("[background:onInstalled]"));
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "ENV_PROBE") return false;
  console.log("[background:from-popup]", message.payload);
  console.log("[background:local-check]", collectEnvProbe());
  return false;
});
