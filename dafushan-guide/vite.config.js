import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // GitHub Pages 项目页：/personal-projects/dafushan-guide/；本地开发仍用相对路径
  base: process.env.GITHUB_PAGES === 'true' ? '/personal-projects/dafushan-guide/' : './',
  plugins: [vue()],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
})
