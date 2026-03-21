const el = document.createElement("div");
el.id = "addfox-manifest-entries-content";
el.textContent = "Content script (from manifest content_scripts)";
el.style.cssText = "position:fixed;bottom:8px;right:8px;padding:6px 10px;background:#333;color:#fff;font-size:12px;border-radius:6px;z-index:9999;";
document.body.appendChild(el);
