<!--
 * @Author: shufei.han
 * @Date: 2024-11-08 18:16:43
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-08 18:19:07
 * @FilePath: \webrtc-demo\client\src\views\main\MainHeader.vue
 * @Description: 
-->
<template>
    <div class="main-header flex-btw">
        <h2>欢迎来到WebRTC demo</h2>
        <div class="flex">
            <span>{{ userInfo.username }}</span>
            <Button @click="logout" class="logout-btn">Logout</Button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useUserAction } from '@/hooks/useUserInfo';
import { useMainStore } from '@/stores/main';
import { Button } from 'ant-design-vue';

const { userInfo } = useMainStore()

const { logout } = useUserAction()

</script>

<style lang="scss" scoped>
.main-header {
    height: 64px;
    background-color: var(--primary);
    color: #fff;
    padding: 0 24px;

    .logout-btn {
        margin-left: 16px;
    }
}
</style>