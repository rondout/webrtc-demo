<script setup lang="ts">
import UserAvatar from "@/components/UserAvatar.vue";
import type { UserInfo } from "@/models/base.model";
defineProps<{ user?: UserInfo }>();
</script>
<template>
  <header class="main-header">
    <div class="contact-heading">
      <UserAvatar :name="user?.username" :size="40" />
      <div>
        <h1>{{ user?.username || "欢迎来到此刻" }}</h1>
        <p>
          <i class="status-dot" :class="{ online: user?.online }" />{{
            user
              ? user.online
                ? "在线 · 可以开始通话"
                : "离线 · 稍后再来聊聊"
              : "从选择一个联系人开始"
          }}
        </p>
      </div>
    </div>
    <span class="technology-badge"
      ><i /> WebRTC<span class="badge-detail"> · 让彼此更近</span></span
    >
  </header>
</template>
