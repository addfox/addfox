import { createRoot } from "react-dom/client";
import App from "./App";

console.log("Options page loaded", fff);

const root = document.getElementById("app");
if (root) createRoot(root).render(<App />);
