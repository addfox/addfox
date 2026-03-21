import App from "./App.svelte";

const target = document.getElementById("app");
if (target) new App({ target });
