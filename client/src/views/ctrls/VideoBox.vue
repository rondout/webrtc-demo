<template>
  <section class="video-panel" aria-label="视频通话">
    <div class="section-heading">
      <h2>面对面，让表达更简单</h2>
      <span class="section-eyebrow">VIDEO SPACE</span>
    </div>
    <div
      ref="stage"
      class="video-stage"
      :class="{ 'has-remote': remoteVideoActive }"
    >
      <div class="stage-rings" aria-hidden="true"><i /><i /></div>
      <div class="stage-hill hill-back" />
      <div class="stage-hill hill-front" />
      <div class="stage-topline">
        <span
          ><i />{{
            state === "connected" ? `通话中 · ${duration}` : "你的专属通话空间"
          }}</span
        ><button
          class="stage-expand icon-button"
          aria-label="全屏视频"
          title="全屏"
          @click="fullscreen"
        >
          <UiIcon name="expand" :size="18" />
        </button>
      </div>
      <video
        v-show="remoteVideoActive"
        ref="remoteVideo"
        class="remote-video"
        autoplay
        playsinline
        @loadedmetadata="playRemote"
      />
      <div v-if="!remoteVideoActive" class="stage-content">
        <div
          class="stage-avatar"
          :class="{ ringing: active && state !== 'connected' }"
        >
          <UserAvatar :name="user" :size="100" /><i v-if="online" />
        </div>
        <h3>{{ callTitle }}</h3>
        <p>{{ subtitle }}</p>
        <div class="stage-actions">
          <template v-if="state === 'idle'"
            ><button
              class="primary-button"
              :disabled="
                !user ||
                !online ||
                connectionStatus !== 'connected' ||
                deviceBusy ||
                !settingsReady ||
                settings.saving
              "
              @click="call"
            >
              <UiIcon name="video" :size="19" />发起视频通话
            </button></template
          ><template v-else-if="state === 'incoming'"
            ><button class="secondary-button decline-button" @click="hangup()">
              暂时不方便</button
            ><button
              class="primary-button"
              :disabled="deviceBusy || !settingsReady || settings.saving"
              @click="accept"
            >
              <UiIcon name="video" :size="19" />接听通话
            </button></template
          ><button
            v-else-if="state !== 'connected'"
            class="secondary-button cancel-call"
            @click="hangup()"
          >
            <UiIcon name="phone" :size="18" />取消呼叫
          </button>
        </div>
      </div>
      <button v-if="audioBlocked" class="audio-play-button" @click="playRemote">
        <UiIcon name="headphones" :size="18" />点击播放对方声音
      </button>
      <div class="self-preview">
        <video
          v-show="cameraLive"
          ref="localVideo"
          autoplay
          muted
          playsinline
        />
        <div v-if="!cameraLive" class="preview-placeholder">
          <UiIcon
            :name="cameraEnabled ? 'video' : 'cameraOff'"
            :size="22"
          /><span>{{ cameraEnabled ? "摄像头尚未开启" : "摄像头已关闭" }}</span>
        </div>
        <span class="self-label"
          >你<UiIcon v-if="!micEnabled" name="micOff" :size="12"
        /></span>
      </div>
    </div>
    <p v-if="error" class="device-error" role="alert">
      <span>{{ error }}</span
      ><button class="icon-button" aria-label="关闭提示" @click="error = ''">
        <UiIcon name="close" :size="16" />
      </button>
    </p>
    <div class="device-toolbar">
      <div class="device-toolbar-top">
        <div class="media-buttons">
          <button
            class="device-button"
            :class="{ muted: !micEnabled }"
            :disabled="controlsDisabled"
            :aria-label="micEnabled ? '关闭麦克风' : '开启麦克风'"
            :aria-pressed="micEnabled"
            :title="micEnabled ? '关闭麦克风' : '开启麦克风'"
            @click="toggleTrack('audio')"
          >
            <UiIcon :name="micEnabled ? 'mic' : 'micOff'" /></button
          ><button
            class="device-button"
            :class="{ muted: !cameraEnabled }"
            :disabled="controlsDisabled"
            :aria-label="cameraEnabled ? '关闭摄像头' : '开启摄像头'"
            :aria-pressed="cameraEnabled"
            :title="cameraEnabled ? '关闭摄像头' : '开启摄像头'"
            @click="toggleTrack('video')"
          >
            <UiIcon :name="cameraEnabled ? 'video' : 'cameraOff'" /></button
          ><button
            v-if="previewActive && !active"
            class="text-button release-devices"
            @click="reset"
          >
            关闭预览
          </button>
        </div>
        <button v-if="active" class="hangup-button" @click="hangup()">
          <UiIcon name="phone" :size="18" />{{
            state === "incoming" ? "拒绝通话" : "结束通话"
          }}</button
        ><button
          v-else
          class="secondary-button"
          :disabled="controlsDisabled"
          @click="checkDevices"
        >
          <UiIcon :name="previewActive ? 'check' : 'headphones'" :size="16" />{{
            deviceBusy
              ? "正在开启设备…"
              : previewActive
                ? "设备已准备好"
                : "检查我的设备"
          }}
        </button>
      </div>
      <div class="toolbar-caption">
        <span>{{
          !settingsReady
            ? "正在读取设备设置…"
            : settings.saving
              ? "正在保存设备偏好…"
              : active || previewActive
                ? `麦克风：${micLive ? "采集中" : "未开启"} · 摄像头：${cameraLive ? "采集中" : "未开启"}`
                : "开关仅设置通话偏好，不会开启设备"
        }}</span
        ><span>{{
          state === "connected" ? duration : "准备就绪，再开始"
        }}</span>
      </div>
    </div>
    <p v-if="settings.loadError" class="device-error" role="alert">
      {{ settings.loadError
      }}<button
        class="text-button"
        :disabled="settings.loading"
        @click="settings.load()"
      >
        重新读取设置
      </button>
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { message } from "ant-design-vue";
import UiIcon from "@/components/UiIcon.vue";
import UserAvatar from "@/components/UserAvatar.vue";
import { useWebRtcCall } from "@/hooks/useWebRtcCall";

const props = defineProps<{ user: string; online: boolean }>();
const emit = defineEmits<{
  incoming: [user: string];
  activeChange: [active: boolean];
}>();

// 组件只负责视图绑定、展示文案和全屏；设备与 WebRTC 生命周期统一由 hook 管理。
const {
  state,
  active,
  duration,
  localVideo,
  remoteVideo,
  settings,
  settingsReady,
  micEnabled,
  cameraEnabled,
  previewActive,
  remoteVideoActive,
  micLive,
  cameraLive,
  deviceBusy,
  controlsDisabled,
  error,
  audioBlocked,
  connectionStatus,
  call,
  accept,
  hangup,
  reset,
  checkDevices,
  toggleTrack,
  playRemote,
} = useWebRtcCall({
  user: () => props.user,
  online: () => props.online,
  onIncoming: (user) => emit("incoming", user),
  onActiveChange: (active) => emit("activeChange", active),
});
const stage = ref<HTMLElement>();
const callTitle = computed(
  () =>
    ({
      idle: props.user ? "有些话，见面说。" : "下一次相见，就在此刻。",
      calling: "等待对方接听…",
      incoming: `${props.user} 邀请你视频通话`,
      connecting: "正在连接彼此…",
      connected: `正在与 ${props.user} 通话`,
    })[state.value],
);
const subtitle = computed(() =>
  state.value === "idle"
    ? !props.user
      ? "从左侧选择一位朋友，开始聊天吧"
      : props.online
        ? `${props.user} 在线，随时可以聊聊`
        : `${props.user} 暂时离线，等 TA 回来再聊吧`
    : state.value === "incoming"
      ? "接通后将按你的设备偏好开启麦克风和摄像头"
      : state.value === "connected"
        ? "对方摄像头未开启，仍可继续聊天"
        : "美好的对话，值得多等一小会儿",
);

/** 切换视频容器全屏，仅属于界面行为，不改变通话连接。 */
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await stage.value?.requestFullscreen();
  } catch {
    message.info("当前浏览器暂不支持全屏");
  }
}
</script>
