import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // 正式站在 daoke.pages.dev 根路径；GITHUB_PAGES 仅留给旧的子路径调试
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
