<!--
 * @Author: shufei.han
 * @Date: 2024-11-07 16:08:55
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-08 17:38:15
 * @FilePath: \webrtc-demo\client\src\App.vue
 * @Description: 
-->
<script setup lang="ts">
import { ConfigProvider } from "ant-design-vue";
import { ConfigProvider as MyConfigProvider } from "tribiani-npm-registry/components";
import { RouterView } from "vue-router";
import { useMainStore } from "./stores/main";

const { theme } = useMainStore();
</script>

<template>
  <ConfigProvider :theme="theme">
    <MyConfigProvider :ant-config-provider-props="{ theme }">
      <RouterView />
    </MyConfigProvider>
  </ConfigProvider>
</template>

<style scoped></style>
