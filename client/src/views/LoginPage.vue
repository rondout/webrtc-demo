<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { message } from "ant-design-vue";
import { mainService } from "@/api/http";
import { useUserAction } from "@/hooks/useUserInfo";
import UiIcon from "@/components/UiIcon.vue";
const { login, loading: loginLoading } = useUserAction();
const registering = ref(false);
const registerLoading = ref(false);
const loading = computed(() => loginLoading.value || registerLoading.value);
const form = reactive({ username: "", password: "" });
function switchMode() {
  if (loading.value) return;
  registering.value = !registering.value;
  form.password = "";
}
async function submit() {
  if (loading.value) return;
  if (!form.username.trim() || !form.password.trim()) {
    message.warning("请输入用户名和密码");
    return;
  }
  const data = { username: form.username.trim(), password: form.password };
  if (!registering.value) {
    await login(data);
    return;
  }
  registerLoading.value = true;
  try {
    await mainService.register(data);
    message.success("注册成功，请登录");
    registering.value = false;
    form.password = "";
  } catch (error) {
    message.error(typeof error === "string" ? error : "注册失败，请稍后重试");
  } finally {
    registerLoading.value = false;
  }
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
        <h2>{{ registering ? "初次见面，欢迎加入。" : "好久不见，欢迎回来。" }}</h2>
        <p class="login-intro">{{ registering ? "创建你的账号，开始新的对话。" : "登录你的账号，和朋友们打个招呼。" }}</p>
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
              :autocomplete="registering ? 'new-password' : 'current-password'"
              placeholder="输入你的密码"
              required
              :disabled="loading" /></label
          ><button class="primary-button" type="submit" :disabled="loading">
            <span>{{ registering ? (loading ? "正在注册…" : "注册账号") : (loading ? "正在登录…" : "进入此刻") }}</span
            ><UiIcon name="arrow" :size="18" />
          </button>
        </form>
        <p class="login-help">
          {{ registering ? "已有账号？" : "还没有账号？" }}
          <button class="auth-switch" type="button" :disabled="loading" @click="switchMode">
            {{ registering ? "去登录" : "注册账号" }}
          </button>
        </p>
        <p class="login-footer">
          <UiIcon name="chat" :size="13" />一条消息，一次见面，一点靠近。
        </p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.auth-switch {
  border: 0;
  background: none;
  color: var(--primary);
  font: inherit;
  cursor: pointer;
  padding: 2px 4px;
}
.auth-switch:hover { text-decoration: underline; }
.auth-switch:disabled { opacity: 0.6; cursor: wait; }
</style>
