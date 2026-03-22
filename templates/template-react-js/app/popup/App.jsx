export default function App() {
  const popupStyle = {
    width: 320,
    minHeight: 200,
    padding: 16,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  };

  return (
    <div style={popupStyle}>
      <img src="/icons/icon_128.png" alt="" width={64} height={64} />
      <div style={{ fontSize: 18, fontWeight: 600 }}>AddFox React</div>
    </div>
  );
}
