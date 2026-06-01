import { createRoot } from "react-dom/client";
import App from "./App";

console.log("Popup script loaded");

const root = document.getElementById("app");
if (root) createRoot(root).render(<App />);


