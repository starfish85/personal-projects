import { createApp } from "vue";
import App from "./App.vue";
import "./styles/global.css";

createApp(App).mount("#app");

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    const base = import.meta.env.BASE_URL || "./";
    const root = base.startsWith("/")
      ? new URL(base, window.location.origin)
      : new URL(
          window.location.pathname.endsWith("/")
            ? window.location.pathname
            : window.location.pathname.replace(/\/[^/]+$/, "/"),
          window.location.origin,
        );
    try {
      const origin = window.location.origin;
      const stolen = new Set([`${origin}/`, `${origin}/personal-projects/`]);
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.filter((reg) => stolen.has(reg.scope)).map((reg) => reg.unregister()));
    } catch {
      /* ignore */
    }
    navigator.serviceWorker.register(new URL("sw.js", root).href, { scope: root.href }).catch(() => {});
  });
}
