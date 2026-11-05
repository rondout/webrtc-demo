/*
 * @Author: shufei.han
 * @Date: 2024-11-07 16:08:55
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-08 18:16:02
 * @FilePath: \webrtc-demo\client\src\router\index.ts
 * @Description:
 */
import { createRouter, createWebHashHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import { useMainStore } from "@/stores/main";

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
      children: [
        {
          path: "/",
          name: "main",
          component: () => import("@/views/main/MainPage.vue"),
        },
        {
          path: "cam",
          name: "cam",
          component: () => import("@/views/cam/CamPage.vue"),
        },
      ],
    },
    {
      path: "/login",
      name: "login",
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import("../views/LoginPage.vue"),
    },
  ],
});

// 刷新和路由切换均以服务端校验结果为准，不能通过修改 localStorage 绕过。
router.beforeEach(async (to) => {
  const loggedIn = await useMainStore().checkAuth();
  if (!loggedIn && to.name !== 'login') return { name: 'login' };
  if (loggedIn && to.name === 'login') return { name: 'main' };
});

export default router;
