import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // 发布到 GitHub Pages 时用绝对子路径，避免 PWA 和片语抢同一个站点身份
  base: process.env.GITHUB_PAGES === 'true' ? '/personal-projects/rike/' : './',
  plugins: [
    vue(),
    {
      name: 'asset-query',
      transformIndexHtml(html) {
        const stamp = Date.now()
        return html
          .replace(/(assets\/[^"?]+\.js)/g, `$1?v=${stamp}`)
          .replace(/(assets\/[^"?]+\.css)/g, `$1?v=${stamp}`)
      },
    },
  ],
  server: {
    host: true,
    port: 5174,
  },
  preview: {
    host: true,
    port: 4174,
    allowedHosts: true,
  },
})
