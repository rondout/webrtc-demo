/*
 * @Author: shufei.han
 * @Date: 2024-11-07 16:08:55
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-08 17:42:26
 * @FilePath: \webrtc-demo\client\src\main.ts
 * @Description: 
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@/assets/main.css' 

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
