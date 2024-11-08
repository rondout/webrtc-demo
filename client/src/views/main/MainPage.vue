<!--
 * @Author: shufei.han
 * @Date: 2024-11-08 18:14:40
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-08 18:28:25
 * @FilePath: \webrtc-demo\client\src\views\main\MainPage.vue
 * @Description: 
-->
<template>
    <div class="main-page full-height">
        <MainHeader />
        <div class="main-content">
            <UserList />
        </div>
    </div>
</template> 

<script setup lang="ts">
import MainHeader from './MainHeader.vue';
import UserList from './UserList.vue';

  
</script> 

<style lang="scss" scoped>
.main-page {
    .main-content {
        height: calc(100% - 64px);
    }
}
</style>