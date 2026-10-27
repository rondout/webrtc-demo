<script setup lang="ts">
import { reactive } from "vue";
import { useUserAction } from "@/hooks/useUserInfo";
import UiIcon from "@/components/UiIcon.vue";
const { login, loading } = useUserAction();
const form = reactive({ username: "", password: "" });
async function submit() {
  if (form.username.trim() && form.password && !loading.value)
    await login({ username: form.username.trim(), password: form.password });
}
</script>
<template>
  <main class="login-page">
    <div class="login-layout">
      <section class="login-art">
        <div class="login-brand">
          <span class="brand-mark"><span>ↄ</span><span>ↄ</span></span
          ><span>此刻<small>/ together</small></span>
        </div>
        <div class="stage-rings" aria-hidden="true"><i /><i /></div>
        <div class="stage-hill hill-back" />
        <div class="stage-hill hill-front" />
        <div class="login-art-copy">
          <span>A LITTLE CLOSER, TOGETHER.</span>
          <h1>让聊天，<br />离彼此近一点。</h1>
          <p>分享今天的小事，听见熟悉的声音。<br />有些话，就留在此刻说吧。</p>
        </div>
        <div class="login-art-bottom">MAKE ROOM FOR A LITTLE HELLO.</div>
      </section>
      <section class="login-form-wrap">
        <span class="login-eyebrow">WELCOME TO TOGETHER</span>
        <h2>好久不见，欢迎回来。</h2>
        <p class="login-intro">登录你的账号，和朋友们打个招呼。</p>
        <form class="login-form" @submit.prevent="submit">
          <label
            >用户名<input
              v-model="form.username"
              name="username"
              autocomplete="username"
              placeholder="输入你的用户名"
              required
              :disabled="loading" /></label
          ><label
            >密码<input
              v-model="form.password"
              name="password"
              type="password"
              autocomplete="current-password"
              placeholder="输入你的密码"
              required
              :disabled="loading" /></label
          ><button class="primary-button" type="submit" :disabled="loading">
            <span>{{ loading ? "正在登录…" : "进入此刻" }}</span
            ><UiIcon name="arrow" :size="18" />
          </button>
        </form>
        <p class="login-help">使用已有的 demo 账号登录</p>
        <p class="login-footer">
          <UiIcon name="chat" :size="13" />一条消息，一次见面，一点靠近。
        </p>
      </section>
    </div>
  </main>
</template>
