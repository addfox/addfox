<template>
  <div class="popup">
    <img src="/icons/icon_128.png" alt="" width="64" height="64" />
    <div class="title">AddFox Vue</div>
    <a class="site-link" href="https://addfox.dev/" target="_blank" rel="noopener noreferrer">addfox.dev</a>
  </div>
</template>

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

.site-link {
  font-size: 13px;
  color: #2563eb;
}
</style>
