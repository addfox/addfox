<template>
  <div class="options">
    <h1>Options</h1>
    <p>{{ status }}</p>
    <button @click="pingBackground">Ping Background</button>
    <label>
      <input v-model="nickname" type="text" placeholder="Nickname" />
      <button @click="save">Save</button>
    </label>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import browser from "webextension-polyfill";

const status = ref("Idle");
const nickname = ref("");

onMounted(async () => {
  const st = await browser.storage.sync.get("nickname");
  nickname.value = (st.nickname as string) || "";
});

async function pingBackground() {
  status.value = "Sending...";
  try {
    const res = await browser.runtime.sendMessage({ type: "PING" });
    status.value = res?.from === "background" ? "Background OK" : String(res);
  } catch (e) {
    status.value = "Error: " + (e as Error).message;
  }
}

function save() {
  browser.storage.sync.set({ nickname: nickname.value });
  status.value = "Saved.";
}
</script>

<style scoped>
.options {
  padding: 24px;
  font-family: system-ui, sans-serif;
}
h1 { margin: 0 0 16px; }
p { margin: 0 0 12px; color: #666; }
button { margin-right: 8px; padding: 6px 12px; cursor: pointer; }
label { display: flex; gap: 8px; align-items: center; margin-top: 12px; }
input { flex: 1; padding: 6px; }
</style>
