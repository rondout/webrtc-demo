/*
 * @Author: shufei.han
 * @Date: 2024-11-07 16:08:55
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-12 16:43:26
 * @FilePath: \webrtc-demo\client\vite.config.ts
 * @Description: 
 */
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  server: {
    https: {
      key: readFileSync(fileURLToPath(new URL('../.certs/dev-key.pem', import.meta.url))),
      cert: readFileSync(fileURLToPath(new URL('../.certs/dev-cert.pem', import.meta.url))),
    },
    port: 5173,
    strictPort: true,
    "host": '0.0.0.0',
    proxy: {
      '/api': {
        target: 'https://localhost:4004',
        // 仅本地开发代理接受项目生成的自签名证书。
        secure: false,
      },
      '/ws': {
        target: 'https://localhost:4004',
        ws: true,
        secure: false,
      },
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
