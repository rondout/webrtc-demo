<!--
 * @Author: shufei.han
 * @Date: 2024-11-08 18:14:40
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-11 16:01:34
 * @FilePath: \webrtc-demo\client\src\views\main\MainPage.vue
 * @Description: 
-->
<template>
    <div class="main-page full-height">
        <MainHeader />
        <div class="main-content flex-start">
            <UserList @userSelect="handleUserSelect" />
            <div class="main-right full-height flex-1 flex">
                <div class="empty-select" v-if="!state.selectedUser">
                    请选择好友
                </div>
                <template v-else>
                    <div class=" msg-box full-height">
                        <MessageBox :user="state.selectedUser" />
                    </div>
                    <div class="video-box full-height">
                        <VideoBox :user="state.selectedUser" />
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue';
import MainHeader from './MainHeader.vue';
import UserList from './UserList.vue';
import { connectWs } from '@/models/ws.model';
import MessageBox from '../ctrls/MessageBox.vue';
import VideoBox from '../ctrls/VideoBox.vue';
import { useMsgStore } from '@/stores/msgStore';

const msgStore = useMsgStore()

const state = reactive({
    selectedUser: null as string,
})

const handleUserSelect = (user:string) => {
    state.selectedUser = user
    msgStore.setCurrentChat(user)
}

onMounted(() => {
    console.log('main page mounted');
    connectWs(() => {
        console.log("WebSocket 连接成功！");
    })
})
</script>

<style lang="scss" scoped>
.main-page {
    .main-content {
        height: calc(100% - 64px);
    }

    .main-right {
        .msg-box {
            width: 50%;
        }

        .video-box {
            width: 50%;
        }
    }
}
</style>