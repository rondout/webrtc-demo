<!--
 * @Author: shufei.han
 * @Date: 2024-11-08 18:25:16
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-08 18:34:24
 * @FilePath: \webrtc-demo\client\src\views\main\UserList.vue
 * @Description: 
-->
<template>
<div class="user-list full-height">
    <div class="user-list-header">
      <div class="title">用户列表</div>
      <div class="search">
      </div>
    </div>
    <div class="friends-list">{{ friends }}</div>
</div>
</template> 

<script setup lang="ts">
import { useUserFriends } from '@/hooks/useUserInfo';

const {friends} = useUserFriends()
</script> 

<style lang="scss" scoped>
.user-list {
    width: 250px;
    border-right: 1px solid var(--primary);
    .user-list-header {
        padding: 12px;
        .title {
            color: var(--primary)
            }
        border-bottom: 1px solid var(--primary);
    }
}
</style>