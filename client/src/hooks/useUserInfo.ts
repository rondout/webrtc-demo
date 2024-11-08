import { useRouter } from 'vue-router';
import { useMainStore } from './../stores/main';
import { setUserLoggedIn, type UserInfo } from '@/models/base.model';
import { message } from 'ant-design-vue';
import confirm from 'ant-design-vue/es/modal/confirm';
import { onMounted, ref } from 'vue';
export function useUserLoggedIn() {
    const mainStore = useMainStore()
    return mainStore.userLoggedIn
}

export function useUserAction() {
    const router = useRouter()
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
            onOk: () => {
                message.success('退出成功')
                setUserLoggedIn()
                router.push('/login')
            }
        })
    }

    return { logout, login, loading }
}

export const useUserFriends = () => {
    const { friends, getAllUsers } = useMainStore()

    onMounted(() => {
        getAllUsers()
    })

    return { friends }
}