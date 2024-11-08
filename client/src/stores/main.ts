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
import { getUserLoggedIn, setUserLoggedIn, type UserInfo } from '@/models/base.model'
import { mainService } from '@/api/http'
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context'
import { message } from 'ant-design-vue'

export const useMainStore = defineStore('counter', () => {

  const initUserInfo = getUserLoggedIn()

  const userInfo = ref<UserInfo>(initUserInfo)
  const getUserInfoFinish = ref(false)
  const themeColor = ref('#3f51b5')
  const userLoggedIn = ref(!!initUserInfo)

  const allUsers = ref<UserInfo[]>([])

  const friends = computed(() => {
    return allUsers.value.filter(user => user.username !== userInfo.value?.username)
  })

  const theme = computed<ThemeConfig>(() => ({
    token: {
      colorPrimary: "#3f51b5",
    },
  }))

  const login = async (user: UserInfo) => {
    try {
      const data = await mainService.login(user)
      userInfo.value = data
      getUserInfoFinish.value = true
      message.success('登录成功')
      userLoggedIn.value = true
      setUserLoggedIn(data)
      return true
    } catch (error) {
      setUserLoggedIn(undefined)
      userLoggedIn.value = false
      message.error(error as string)
      getUserInfoFinish.value = false
      return false
    }
  }

  const getAllUsers = async () => {
    const users =  await mainService.getAllUser()
    allUsers.value = users
  }

  watchEffect(() => {
    document.documentElement.style.setProperty('--primary', themeColor.value)
  })

  return { userInfo, login, getUserInfoFinish, theme, themeColor, userLoggedIn, getAllUsers, friends }
})
