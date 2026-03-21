<script lang="ts">
  import browser from "webextension-polyfill";
  let status = "Idle";

  async function pingBackground() {
    status = "Sending...";
    try {
      const res = await browser.runtime.sendMessage({ type: "PING" });
      status = res?.from === "background" ? "Background OK" : String(res);
    } catch (e) {
      status = "Error: " + (e as Error).message;
    }
  }
</script>

<div style="padding: 24px; font-family: system-ui, sans-serif;">
  <h1 style="margin: 0 0 16px;">Svelte Options</h1>
  <p style="margin: 0 0 12px; color: #666;">{status}</p>
  <button type="button" on:click={pingBackground} style="margin-right: 8px; padding: 6px 12px; cursor: pointer;">
    Ping Background
  </button>
</div>
