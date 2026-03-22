export default function App() {
  const popupStyle = {
    width: "320px",
    "min-height": "200px",
    padding: "16px",
    "box-sizing": "border-box",
    display: "flex",
    "flex-direction": "column",
    "align-items": "center",
    "justify-content": "center",
    gap: "12px",
    "font-family": 'system-ui, -apple-system, "Segoe UI", sans-serif',
  };

  const titleStyle = {
    "font-size": "18px",
    "font-weight": "600",
  };

  return (
    <div style={popupStyle}>
      <img src="/icons/icon_128.png" alt="" width={64} height={64} />
      <div style={titleStyle}>AddFox Solid</div>
      <a
        href="https://addfox.dev/"
        target="_blank"
        rel="noopener noreferrer"
        style={{ "font-size": "13px", color: "#2563eb" }}
      >
        addfox.dev
      </a>
    </div>
  );
}
