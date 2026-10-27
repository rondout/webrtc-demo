<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { message } from "ant-design-vue";
import {
  CallMsgs,
  connectionStatus,
  WsMsgs,
  WsMsgTypes,
} from "@/models/ws.model";
import { useMsgStore } from "@/stores/msgStore";
import { useMainStore } from "@/stores/main";
import UiIcon from "@/components/UiIcon.vue";
import UserAvatar from "@/components/UserAvatar.vue";
const props = defineProps<{ user: string }>();
const store = useMsgStore();
const main = useMainStore();
const draft = ref("");
const list = ref<HTMLElement>();
const input = ref<HTMLTextAreaElement>();
const emojiOpen = ref(false);
const canSend = computed(
  () =>
    !!props.user &&
    !!draft.value.trim() &&
    connectionStatus.value === "connected",
);
const emojis = ["👋", "😊", "👍", "❤️", "🎉", "👀"];
function self(from: string) {
  return from === main.userInfo?.username;
}
function timeLabel(time: string | number) {
  const date = new Date(time);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}
function dayLabel(time: string | number) {
  const date = new Date(time);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toDateString() === new Date().toDateString()
      ? "今天"
      : date.toLocaleDateString("zh-CN", { month: "long", day: "numeric" });
}
function send() {
  if (!canSend.value) return;
  try {
    new WsMsgs(
      WsMsgTypes.CHAT_MSG,
      new CallMsgs(props.user, draft.value.trim()),
    ).send();
    draft.value = "";
    emojiOpen.value = false;
    input.value?.focus();
  } catch {
    message.error("消息发送失败，请稍后重试");
  }
}
function keydown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    send();
  }
}
function addEmoji(emoji: string) {
  draft.value += emoji;
  emojiOpen.value = false;
  input.value?.focus();
}
watch(
  () => props.user,
  () => {
    draft.value = "";
    emojiOpen.value = false;
  },
);
watch(
  () => [props.user, store.currentChatMsgs.length],
  async () => {
    await nextTick();
    list.value?.scrollTo({ top: list.value.scrollHeight, behavior: "smooth" });
  },
  { immediate: true },
);
</script>
<template>
  <section class="chat-panel" aria-label="聊天消息">
    <div class="section-heading">
      <h2>聊天</h2>
      <span class="section-eyebrow">SAY HELLO</span>
    </div>
    <div
      ref="list"
      class="message-list"
      role="log"
      aria-label="消息记录"
      aria-live="polite"
    >
      <div v-if="!store.currentChatMsgs.length" class="chat-empty">
        <span class="empty-chat-icon"><UiIcon name="chat" :size="28" /></span>
        <h3>{{ user ? "从一句「在吗」开始" : "每段对话，都值得期待" }}</h3>
        <p>
          {{ user ? `向 ${user} 打个招呼吧` : "选择一位朋友，开始你们的对话" }}
        </p>
      </div>
      <template v-for="(msg, index) in store.currentChatMsgs" :key="index"
        ><div
          v-if="
            index === 0 ||
            dayLabel(msg.time) !==
              dayLabel(store.currentChatMsgs[index - 1].time)
          "
          class="message-date"
        >
          {{ dayLabel(msg.time) }}
        </div>
        <div class="message-row" :class="{ 'is-self': self(msg.from) }">
          <UserAvatar v-if="!self(msg.from)" :name="msg.from" :size="30" />
          <div class="message-stack">
            <span class="message-meta"
              >{{ self(msg.from) ? "我" : msg.from
              }}<time>{{ timeLabel(msg.time) }}</time></span
            >
            <p class="message-bubble">{{ msg.content }}</p>
          </div>
        </div></template
      >
    </div>
    <form class="message-composer" @submit.prevent="send">
      <textarea
        ref="input"
        v-model="draft"
        :disabled="!user"
        :placeholder="user ? `发条消息给 ${user}…` : '先选择一位联系人…'"
        aria-label="消息内容"
        rows="2"
        @keydown="keydown"
      />
      <div class="composer-tools">
        <div class="emoji-container">
          <button
            class="icon-button"
            type="button"
            aria-label="选择表情"
            :disabled="!user"
            :aria-expanded="emojiOpen"
            @click="emojiOpen = !emojiOpen"
          >
            <UiIcon name="smile" />
          </button>
          <div v-if="emojiOpen" class="emoji-picker">
            <button
              v-for="emoji in emojis"
              :key="emoji"
              type="button"
              :aria-label="emoji"
              @click="addEmoji(emoji)"
            >
              {{ emoji }}
            </button>
          </div>
        </div>
        <span class="keyboard-hint">Enter 发送 · Shift + Enter 换行</span
        ><button
          class="send-button"
          type="submit"
          :disabled="!canSend"
          aria-label="发送消息"
        >
          <UiIcon name="send" :size="19" />
        </button>
      </div>
    </form>
  </section>
</template>
