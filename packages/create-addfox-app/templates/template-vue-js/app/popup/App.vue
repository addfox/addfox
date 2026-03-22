<template>
  <div class="popup">
    <img src="/icons/icon_128.png" alt="" width="64" height="64" />
    <div class="title">AddFox Vue</div>
  </div>
</template>

<script setup></script>

<style scoped>
.popup {
  width: 320px;
  min-height: 200px;
  padding: 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
}

.title {
  font-size: 18px;
  font-weight: 600;
}
</style>
