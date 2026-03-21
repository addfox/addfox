<template>
  <div class="popup">
    <h2>Vue Popup1312313</h2>
    <p>{{ status }}</p>
    <button @click="pingBackground">Ping Background</button>
    <button @click="sendToContent">Send to Content</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import browser from "webextension-polyfill";

const status = ref("Idle");

async function pingBackground() {
  status.value = "Sending...";
  try {
    const res = await browser.runtime.sendMessage({ type: "PING" });
    status.value = res?.from === "background" ? "Background OK" : String(res);
  } catch (e) {
    status.value = "Error: " + (e as Error).message;
  }
}

async function sendToContent() {
  status.value = "Sending to content...";
  try {
    const res = await browser.runtime.sendMessage({
      type: "RELAY_TO_CONTENT",
      payload: { text: "Hello from popup at " + new Date().toISOString() },
    });
    status.value = typeof res === "object" ? "Content: " + JSON.stringify(res) : String(res);
  } catch (e) {
    status.value = "Error: " + (e as Error).message;
  }
}
</script>

<style scoped>
.popup {
  width: 280px;
  padding: 12px;
  font-family: system-ui, sans-serif;
}
h2 { margin: 0 0 8px; font-size: 16px; }
p { margin: 0 0 12px; font-size: 13px; color: #666; }
button {
  margin-right: 8px;
  margin-bottom: 8px;
  padding: 6px 12px;
  cursor: pointer;
}
</style>
