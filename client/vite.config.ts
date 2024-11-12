/*
 * @Author: shufei.han
 * @Date: 2024-11-07 16:08:55
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-12 16:43:26
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
    "host": '0.0.0.0',
    proxy: {
      '/api': 'http://localhost:4004'
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
