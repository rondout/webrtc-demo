/*
 * @Author: shufei.han
 * @Date: 2024-11-07 16:08:55
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-08 18:16:02
 * @FilePath: \webrtc-demo\client\src\router\index.ts
 * @Description: 
 */
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { useUserLoggedIn } from '@/hooks/useUserInfo';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      children: [
        {
          path: '/',
          name: 'main',
          component: () => import('@/views/main/MainPage.vue')
        }
      ]
    },
    {
      path: '/login',
      name: 'login',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/LoginPage.vue')
    }
  ]
})

router.beforeEach((to, from, next) => {
  if(useUserLoggedIn() || to.name === 'login') {
    next()
  } else {
    next('/login')
  }
})

export default router
