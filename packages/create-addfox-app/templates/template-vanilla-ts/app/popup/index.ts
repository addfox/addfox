function applyPopupLayout(el: HTMLElement): void {
  el.style.width = "320px";
  el.style.minHeight = "200px";
  el.style.padding = "16px";
  el.style.boxSizing = "border-box";
  el.style.display = "flex";
  el.style.flexDirection = "column";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.gap = "12px";
  el.style.fontFamily = 'system-ui, -apple-system, "Segoe UI", sans-serif';
}

function createIcon(): HTMLImageElement {
  const img = document.createElement("img");
  img.src = "/icons/icon_128.png";
  img.alt = "";
  img.width = 64;
  img.height = 64;
  return img;
}

function createTitle(): HTMLDivElement {
  const title = document.createElement("div");
  title.textContent = "AddFox Vanilla";
  title.style.fontSize = "18px";
  title.style.fontWeight = "600";
  return title;
}

function createSiteLink(): HTMLAnchorElement {
  const a = document.createElement("a");
  a.href = "https://addfox.dev/";
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = "addfox.dev";
  a.style.fontSize = "13px";
  a.style.color = "#2563eb";
  return a;
}

function mountPopup(root: HTMLElement): void {
  applyPopupLayout(root);
  root.append(createIcon(), createTitle(), createSiteLink());
}

const root = document.getElementById("root");
if (root) mountPopup(root);
