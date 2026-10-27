<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { message } from "ant-design-vue";
import MainHeader from "./MainHeader.vue";
import UserList from "./UserList.vue";
import MessageBox from "../ctrls/MessageBox.vue";
import VideoBox from "../ctrls/VideoBox.vue";
import UiIcon from "@/components/UiIcon.vue";
import UserAvatar from "@/components/UserAvatar.vue";
import { closeWs, connectWs, connectionStatus } from "@/models/ws.model";
import { useMsgStore } from "@/stores/msgStore";
import { useMainStore } from "@/stores/main";
import { useUserAction } from "@/hooks/useUserInfo";
const main = useMainStore();
const messages = useMsgStore();
const { logout } = useUserAction();
const selectedUser = ref("");
const mobileContacts = ref(false);
const activeTab = ref<"video" | "chat">("video");
const inCall = ref(false);
const selectedFriend = computed(() =>
  main.friends.find((user) => user.username === selectedUser.value),
);
function selectUser(username: string) {
  if (inCall.value && username !== selectedUser.value) {
    message.info("请先结束当前通话，再切换联系人");
    return;
  }
  selectedUser.value = username;
  messages.setCurrentChat(username);
  mobileContacts.value = false;
}
function receiveCall(username: string) {
  selectUser(username);
  activeTab.value = "video";
}
watch(
  () => main.friends,
  (friends) => {
    if (
      !selectedUser.value ||
      !friends.some((friend) => friend.username === selectedUser.value)
    )
      selectUser(friends[0]?.username || "");
  },
  { immediate: true },
);
// Create the service before children register signaling listeners.
connectWs();
onMounted(async () => {
  try {
    await Promise.all([main.getAllUsers(), messages.getAllChatMessages()]);
  } catch {
    message.error("加载联系人或消息失败，请检查服务后刷新页面");
  }
});
onBeforeUnmount(closeWs);
</script>
<template>
  <main class="app-page">
    <div class="workspace">
      <nav class="nav-rail" aria-label="主导航">
        <a class="brand-mark" href="/" aria-label="此刻首页"
          ><span>ↄ</span><span>ↄ</span></a
        >
        <div class="rail-links">
          <button
            class="rail-button"
            :class="{ active: activeTab === 'chat' }"
            aria-label="聊天"
            title="聊天"
            @click="activeTab = 'chat'"
          >
            <UiIcon name="chat" />
          </button>
          <button
            class="rail-button"
            :class="{ active: activeTab === 'video' }"
            aria-label="视频通话"
            title="视频通话"
            @click="activeTab = 'video'"
          >
            <UiIcon name="video" />
          </button>
          <button
            class="rail-button contacts-toggle"
            :class="{ active: mobileContacts }"
            aria-label="联系人"
            title="联系人"
            @click="mobileContacts = !mobileContacts"
          >
            <UiIcon name="people" />
          </button>
        </div>
        <div class="rail-bottom">
          <button
            class="rail-button"
            aria-label="退出登录"
            title="退出登录"
            @click="logout"
          >
            <UiIcon name="logout" /></button
          ><UserAvatar
            :name="main.userInfo?.username"
            :size="38"
            :online="connectionStatus === 'connected'"
            status
          />
        </div>
      </nav>
      <button
        v-if="mobileContacts"
        class="sidebar-backdrop"
        aria-label="关闭联系人列表"
        @click="mobileContacts = false"
      />
      <UserList
        :selected-user="selectedUser"
        :class="{ 'mobile-open': mobileContacts }"
        @user-select="selectUser"
      />
      <section class="conversation">
        <MainHeader :user="selectedFriend" />
        <div
          v-if="connectionStatus !== 'connected'"
          class="connection-notice"
          role="status"
        >
          <span class="status-dot" />{{
            connectionStatus === "connecting"
              ? "正在连接消息服务…"
              : "消息服务已断开，请检查服务后刷新重试"
          }}<button
            v-if="connectionStatus === 'disconnected'"
            class="text-button"
            @click="connectWs()"
          >
            重新连接
          </button>
        </div>
        <div class="mobile-tabs" aria-label="会话视图">
          <button
            :class="{ active: activeTab === 'video' }"
            @click="activeTab = 'video'"
          >
            <UiIcon name="video" :size="16" /> 视频空间</button
          ><button
            :class="{ active: activeTab === 'chat' }"
            @click="activeTab = 'chat'"
          >
            <UiIcon name="chat" :size="16" /> 聊天
          </button>
        </div>
        <div class="conversation-body" :class="`show-${activeTab}`">
          <VideoBox
            :user="selectedUser"
            :online="!!selectedFriend?.online"
            @incoming="receiveCall"
            @active-change="inCall = $event"
          /><MessageBox :user="selectedUser" />
        </div>
        <footer class="workspace-footer">
          <span>距离远一点，也没关系。</span><span>TOGETHER / 此刻</span>
        </footer>
      </section>
    </div>
    <div class="page-caption">
      <span><i /> 留一点时间，好好说话。</span
      ><span>A LITTLE CLOSER, TOGETHER.</span>
    </div>
  </main>
</template>
