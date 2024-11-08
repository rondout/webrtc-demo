/*
 * @Author: shufei.han
 * @Date: 2024-11-07 16:08:55
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-07 17:32:14
 * @FilePath: \webrtc-demo\client\vite.config.ts
 * @Description: 
 */
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:4000'
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
