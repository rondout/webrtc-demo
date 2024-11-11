/*
 * @Author: shufei.han
 * @Date: 2024-11-08 18:06:28
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-11 14:38:13
 * @FilePath: \webrtc-demo\client\src\hooks\useUserInfo.ts
 * @Description: 
 */
import { useRouter } from 'vue-router';
import { useMainStore } from './../stores/main';
import { setUserLoggedIn, type UserInfo } from '@/models/base.model';
import { message } from 'ant-design-vue';
import confirm from 'ant-design-vue/es/modal/confirm';
import { onMounted, ref, toRef } from 'vue';
import { mainService } from '@/api/http';
import { closeWs } from '@/models/ws.model';
import router from '@/router';
export function useUserLoggedIn() {
    const mainStore = useMainStore()
    return mainStore.userLoggedIn
}

export function useUserAction() {
    const loading = ref(false)
    const mainStore = useMainStore()

    const login = async (user: UserInfo) => {
        loading.value = true;
        const success = await mainStore.login(user);
        loading.value = false;
        success && router.push('/')
    }

    const logout = () => {
        confirm({
            title: '退出登录',
            content: '是否退出登录？',
            onOk: async () => {
                await mainService.logout()
                message.success('退出成功')
                setUserLoggedIn()
                router.push('/login')
                closeWs()
            }
        })
    }

    const setUserOnlineStatus = (user: string, status: boolean) => {
        mainStore.updateUser(user, status)
    }

    return { logout, login, loading, setUserOnlineStatus }
}

export const useUserFriends = () => {
    const mainStore = useMainStore()

    onMounted(() => {
        mainStore.getAllUsers()
    })

    return { friends: toRef(() => mainStore.friends) }
}
