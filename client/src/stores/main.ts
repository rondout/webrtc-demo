/*
 * @Author: shufei.han
 * @Date: 2024-11-07 16:08:55
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-08 18:13:34
 * @FilePath: \webrtc-demo\client\src\stores\main.ts
 * @Description: 
 */
import { computed, ref, watchEffect } from 'vue'
import { defineStore } from 'pinia'
import { type UserInfo } from '@/models/base.model'
import { mainService } from '@/api/http'
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context'
import { message } from 'ant-design-vue'

export const useMainStore = defineStore('main', () => {

  // 移除旧版本缓存，不再把本地数据作为登录依据。
  localStorage.removeItem('userLoginStatus')

  const userInfo = ref<UserInfo>(null)
  const getUserInfoFinish = ref(false)
  const themeColor = ref('#df784f')
  const userLoggedIn = ref(false)
  const getFriendsFinish = ref(false)

  const allUsers = ref<UserInfo[]>([])

  const friends = computed(() => {
    return allUsers.value.filter(user => user.username !== userInfo.value?.username)
  })

  const theme = computed<ThemeConfig>(() => ({
    token: {
      colorPrimary: themeColor.value,
      borderRadius: 10,
      fontFamily: "'DM Sans', 'Segoe UI', 'Microsoft YaHei', sans-serif",
    },
  }))

  const login = async (user: UserInfo) => {
    try {
      const data = await mainService.login(user)
      userInfo.value = data
      getUserInfoFinish.value = true
      message.success('登录成功')
      userLoggedIn.value = true
      return true
    } catch (error) {
      userInfo.value = null
      userLoggedIn.value = false
      message.error(error as string)
      getUserInfoFinish.value = false
      return false
    }
  }

  // 路由放行前校验服务端会话；用户信息仅保存在当前页面的 Pinia 内存中。
  const checkAuth = async () => {
    getUserInfoFinish.value = false
    try {
      const user = await mainService.checkAuth()
      userInfo.value = user
      userLoggedIn.value = !!user
      getUserInfoFinish.value = !!user
      return !!user
    } catch {
      userInfo.value = null
      userLoggedIn.value = false
      return false
    }
  }

  const getAllUsers = async () => {
    const users = await mainService.getAllUser()
    allUsers.value = users
    getFriendsFinish.value = true
  }

  const updateUser = (username: string, status: boolean) => {
    const user = allUsers.value.find(item => item.username === username)
    user && (user.online = status)
  }

  watchEffect(() => {
    document.documentElement.style.setProperty('--primary', themeColor.value)
  })

  return { userInfo, checkAuth, login, getUserInfoFinish, theme, themeColor, userLoggedIn, getAllUsers, friends, updateUser, getFriendsFinish }
})
