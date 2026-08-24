import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // 相对路径：局域网预览和 GitHub Pages 用同一份 dist，避免 JS 404 白屏
  base: './',
  plugins: [
    vue(),
    {
      name: 'asset-query',
      transformIndexHtml(html) {
        const stamp = Date.now()
        return html
          .replace(/(\.\/assets\/[^"]+\.js)/g, `$1?v=${stamp}`)
          .replace(/(\.\/assets\/[^"]+\.css)/g, `$1?v=${stamp}`)
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
