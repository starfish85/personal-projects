import { createApp } from "vue";
import App from "./App.vue";
import "./styles/global.css";

createApp(App).mount("#app");

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const sw = new URL("sw.js", window.location.href);
    const scope = new URL("./", window.location.href);
    navigator.serviceWorker.register(sw.href, { scope: scope.href }).catch(() => {});
  });
}
