<script setup lang="ts">
import { computed, ref } from "vue";
import { useMainStore } from "@/stores/main";
import { useMsgStore } from "@/stores/msgStore";
import UiIcon from "@/components/UiIcon.vue";
import UserAvatar from "@/components/UserAvatar.vue";
defineProps<{ selectedUser: string }>();
defineEmits<{ userSelect: [user: string] }>();
const main = useMainStore();
const messages = useMsgStore();
const search = ref("");
const filteredFriends = computed(() =>
  main.friends.filter((user) =>
    user.username
      .toLocaleLowerCase()
      .includes(search.value.trim().toLocaleLowerCase()),
  ),
);
const onlineCount = computed(
  () => main.friends.filter((user) => user.online).length,
);
function lastMessage(username: string) {
  return [...messages.allChatMsgs]
    .reverse()
    .find((msg) => msg.from === username || msg.to === username);
}
function preview(username: string) {
  const msg = lastMessage(username);
  return msg
    ? `${msg.from === main.userInfo?.username ? "我：" : ""}${msg.content}`
    : "打个招呼，开始聊天吧";
}
function timeLabel(username: string) {
  const time = lastMessage(username)?.time;
  if (!time) return "";
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString() === new Date().toLocaleDateString()
    ? date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}
</script>
<template>
  <aside class="contacts-sidebar">
    <div class="sidebar-brand">
      <div class="sidebar-identity">
        <h2>此刻<span>/ together</span></h2>
        <p class="current-account" :title="main.userInfo?.username">
          当前登录：<strong>{{ main.userInfo?.username }}</strong>
        </p>
      </div>
      <span class="brand-spark">✳</span>
    </div>
    <label class="contact-search"
      ><UiIcon name="search" :size="17" /><input
        v-model="search"
        type="search"
        placeholder="搜索联系人"
        aria-label="搜索联系人"
    /></label>
    <div class="list-heading">
      <h3>消息</h3>
      <span>{{ String(main.friends.length).padStart(2, "0") }}</span>
    </div>
    <div class="friends-list">
      <button
        v-for="user in filteredFriends"
        :key="user.username"
        class="friend-item"
        :class="{ selected: selectedUser === user.username }"
        :aria-pressed="selectedUser === user.username"
        @click="$emit('userSelect', user.username)"
      >
        <UserAvatar :name="user.username" :online="user.online" status /><span
          class="friend-details"
          ><span class="friend-name"
            >{{ user.username
            }}<time>{{ timeLabel(user.username) }}</time></span
          ><span class="friend-preview">{{
            preview(user.username)
          }}</span></span
        >
      </button>
      <p v-if="!filteredFriends.length" class="list-empty">
        {{
          search
            ? "没有找到这位朋友"
            : main.getFriendsFinish
              ? "还没有联系人，用另一个账号登录后就能在这里找到彼此。"
              : "正在寻找你的朋友…"
        }}
      </p>
    </div>
    <p class="online-count">
      <i class="status-dot online" />{{ onlineCount }} 位朋友在线
    </p>
    <div class="sidebar-note">
      <span class="note-decoration">hello,</span>
      <h3>距离远一点，也没关系。</h3>
      <p>发条消息，或者见个面。</p>
      <span class="note-footer"
        >Make room for a little hello.<UiIcon name="arrow" :size="16"
      /></span>
    </div>
  </aside>
</template>
