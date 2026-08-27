import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/personal-projects/pianyu/" : "./",
  plugins: [
    vue(),
    {
      name: "inline-css",
      apply: "build",
      enforce: "post",
      transformIndexHtml: {
        order: "post",
        handler(html, ctx) {
          if (!ctx.bundle) return html;
          let css = "";
          for (const chunk of Object.values(ctx.bundle)) {
            if (chunk.type === "asset" && typeof chunk.fileName === "string" && chunk.fileName.endsWith(".css")) {
              css += chunk.source;
            }
          }
          if (!css) return html;
          return html
            .replace(/<link rel="stylesheet"[^>]*>/g, "")
            .replace("</head>", `<style>${css}</style></head>`);
        },
      },
    },
  ],
  build: {
    cssCodeSplit: false,
    assetsInlineLimit: 4096,
    modulePreload: { polyfill: false },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
});
