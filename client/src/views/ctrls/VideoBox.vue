<template>
  <section class="video-panel" aria-label="视频通话">
    <div class="section-heading">
      <h2>面对面，让表达更简单</h2>
      <span class="section-eyebrow">VIDEO SPACE</span>
    </div>
    <div
      ref="stage"
      class="video-stage"
      :class="{ 'has-remote': remoteStream }"
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
        v-show="remoteStream"
        ref="remoteVideo"
        class="remote-video"
        autoplay
        playsinline
        @loadedmetadata="playRemote"
      />
      <div v-if="!remoteStream" class="stage-content">
        <div class="stage-avatar" :class="{ ringing: active }">
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
                deviceBusy
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
              :disabled="deviceBusy"
              @click="accept"
            >
              <UiIcon name="video" :size="19" />接听通话
            </button></template
          ><button
            v-else
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
          v-show="localStream && cameraEnabled"
          ref="localVideo"
          autoplay
          muted
          playsinline
        />
        <div v-if="!localStream || !cameraEnabled" class="preview-placeholder">
          <UiIcon
            :name="cameraEnabled ? 'video' : 'cameraOff'"
            :size="22"
          /><span>{{ !localStream ? "摄像头尚未开启" : "摄像头已关闭" }}</span>
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
            :disabled="deviceBusy"
            :aria-label="micEnabled ? '关闭麦克风' : '开启麦克风'"
            :aria-pressed="micEnabled"
            :title="micEnabled ? '关闭麦克风' : '开启麦克风'"
            @click="toggleTrack('audio')"
          >
            <UiIcon :name="micEnabled ? 'mic' : 'micOff'" /></button
          ><button
            class="device-button"
            :class="{ muted: !cameraEnabled }"
            :disabled="deviceBusy"
            :aria-label="cameraEnabled ? '关闭摄像头' : '开启摄像头'"
            :aria-pressed="cameraEnabled"
            :title="cameraEnabled ? '关闭摄像头' : '开启摄像头'"
            @click="toggleTrack('video')"
          >
            <UiIcon :name="cameraEnabled ? 'video' : 'cameraOff'" /></button
          ><button
            v-if="localStream && !active"
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
          :disabled="deviceBusy"
          @click="checkDevices"
        >
          <UiIcon :name="localStream ? 'check' : 'headphones'" :size="16" />{{
            deviceBusy
              ? "正在开启设备…"
              : localStream
                ? "设备已准备好"
                : "检查我的设备"
          }}
        </button>
      </div>
      <div class="toolbar-caption">
        <span>{{
          active ? "好好聊天，享受此刻。" : "通话前，你可以检查麦克风和摄像头"
        }}</span
        ><span>{{
          state === "connected" ? duration : "准备就绪，再开始"
        }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  shallowRef,
  watch,
} from "vue";
import { message } from "ant-design-vue";
import UiIcon from "@/components/UiIcon.vue";
import UserAvatar from "@/components/UserAvatar.vue";
import { createPeerConnection, getMediaStream } from "@/models/webrtc.model";
import {
  CallMsgs,
  connectionStatus,
  wsService,
  WsMsgs,
  WsMsgTypes,
} from "@/models/ws.model";

const props = defineProps<{ user: string; online: boolean }>();
const emit = defineEmits<{
  incoming: [user: string];
  activeChange: [active: boolean];
}>();
type CallState = "idle" | "calling" | "incoming" | "connecting" | "connected";
const state = ref<CallState>("idle");
const localVideo = ref<HTMLVideoElement>();
const remoteVideo = ref<HTMLVideoElement>();
const stage = ref<HTMLElement>();
const localStream = shallowRef<MediaStream>();
const remoteStream = shallowRef<MediaStream>();
const micEnabled = ref(true);
const cameraEnabled = ref(true);
const deviceBusy = ref(false);
const error = ref("");
const seconds = ref(0);
const audioBlocked = ref(false);
let pc: RTCPeerConnection | undefined;
let peer = "";
let pendingOffer: RTCSessionDescriptionInit | undefined;
let candidates: RTCIceCandidateInit[] = [];
let callTimeout: ReturnType<typeof setTimeout> | undefined;
let timer: ReturnType<typeof setInterval> | undefined;
let generation = 0;
let disposed = false;
const active = computed(() => state.value !== "idle");
const duration = computed(
  () =>
    `${String(Math.floor(seconds.value / 60)).padStart(2, "0")}:${String(seconds.value % 60).padStart(2, "0")}`,
);
const callTitle = computed(
  () =>
    ({
      idle: props.user ? "有些话，见面说。" : "下一次相见，就在此刻。",
      calling: "等待对方接听…",
      incoming: `${peer} 邀请你视频通话`,
      connecting: "正在连接彼此…",
      connected: "",
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
      ? "准备好了吗？接通后将开启摄像头和麦克风"
      : "美好的对话，值得多等一小会儿",
);
watch(active, (value) => emit("activeChange", value), { flush: "sync" });

function signal(type: WsMsgTypes, content?: unknown, to = peer) {
  new WsMsgs(type, new CallMsgs(to, content)).send();
}
function deviceError(cause: unknown) {
  const name = cause instanceof DOMException ? cause.name : "";
  return name === "NotAllowedError"
    ? "摄像头或麦克风权限未开启，请在浏览器地址栏允许访问后重试。"
    : name === "NotFoundError"
      ? "没有找到摄像头或麦克风，请连接设备后重试。"
      : name === "NotReadableError"
        ? "设备可能正被其他应用使用，请关闭占用设备的应用后重试。"
        : "无法开启摄像头或麦克风，请检查设备和浏览器权限。";
}
async function prepareDevices() {
  if (localStream.value) return localStream.value;
  if (!navigator.mediaDevices?.getUserMedia)
    throw new Error("请通过 localhost 或 HTTPS 访问以启用设备");
  deviceBusy.value = true;
  const currentGeneration = generation;
  try {
    const stream = await getMediaStream();
    if (disposed || currentGeneration !== generation) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    stream.getAudioTracks().forEach((track) => {
      track.enabled = micEnabled.value;
    });
    stream.getVideoTracks().forEach((track) => {
      track.enabled = cameraEnabled.value;
    });
    localStream.value = stream;
    await nextTick();
    if (localVideo.value) localVideo.value.srcObject = stream;
    return stream;
  } finally {
    deviceBusy.value = false;
  }
}
async function checkDevices() {
  error.value = "";
  try {
    await prepareDevices();
  } catch (cause) {
    error.value = navigator.mediaDevices
      ? deviceError(cause)
      : "请通过 localhost 或 HTTPS 访问以启用摄像头和麦克风。";
  }
}
function reset() {
  generation++;
  clearTimeout(callTimeout);
  clearInterval(timer);
  timer = undefined;
  callTimeout = undefined;
  if (pc) {
    pc.onconnectionstatechange = null;
    pc.ontrack = null;
    pc.onicecandidate = null;
    pc.close();
  }
  pc = undefined;
  localStream.value?.getTracks().forEach((track) => track.stop());
  remoteStream.value?.getTracks().forEach((track) => track.stop());
  localStream.value = undefined;
  remoteStream.value = undefined;
  if (localVideo.value) localVideo.value.srcObject = null;
  if (remoteVideo.value) remoteVideo.value.srcObject = null;
  pendingOffer = undefined;
  candidates = [];
  peer = "";
  seconds.value = 0;
  state.value = "idle";
  audioBlocked.value = false;
  micEnabled.value = true;
  cameraEnabled.value = true;
}
function hangup(notify = true) {
  if (notify && peer && connectionStatus.value === "connected") {
    try {
      signal(WsMsgTypes.END_CALL);
    } catch {
      /* socket already closed */
    }
  }
  reset();
}
function startTimeout() {
  callTimeout = setTimeout(() => {
    hangup();
    error.value = "暂时没有接通，稍后再试试吧。";
  }, 45000);
}
async function playRemote() {
  const currentGeneration = generation;
  if (!remoteStream.value) return;
  try {
    await remoteVideo.value?.play();
    if (generation === currentGeneration) audioBlocked.value = false;
  } catch {
    if (generation === currentGeneration && remoteStream.value)
      audioBlocked.value = true;
  }
}
function setupPeer(stream: MediaStream) {
  const connection = createPeerConnection();
  pc = connection;
  stream.getTracks().forEach((track) => connection.addTrack(track, stream));
  connection.onicecandidate = (event) => {
    if (event.candidate && connectionStatus.value === "connected")
      signal(WsMsgTypes.ICE, event.candidate.toJSON());
  };
  connection.ontrack = async (event) => {
    if (pc !== connection) return;
    remoteStream.value = event.streams[0] || new MediaStream([event.track]);
    await nextTick();
    if (pc !== connection) return;
    if (remoteVideo.value) {
      remoteVideo.value.srcObject = remoteStream.value;
      await playRemote();
    }
  };
  connection.onconnectionstatechange = () => {
    if (pc !== connection) return;
    if (connection.connectionState === "connected") {
      state.value = "connected";
      clearTimeout(callTimeout);
      if (!timer) timer = setInterval(() => seconds.value++, 1000);
    } else if (
      connection.connectionState === "failed" ||
      connection.connectionState === "closed"
    ) {
      hangup();
      error.value = "通话连接已结束，可以重新发起通话。";
    }
  };
  return connection;
}
async function flushCandidates(connection: RTCPeerConnection) {
  const queued = candidates.splice(0);
  for (const candidate of queued) await connection.addIceCandidate(candidate);
}
async function call() {
  if (
    !props.user ||
    !props.online ||
    active.value ||
    connectionStatus.value !== "connected"
  )
    return;
  error.value = "";
  peer = props.user;
  state.value = "calling";
  const currentGeneration = generation;
  try {
    const stream = await prepareDevices();
    if (!stream || generation !== currentGeneration) return;
    const connection = setupPeer(stream);
    await connection.setLocalDescription(await connection.createOffer());
    if (pc !== connection) return;
    signal(WsMsgTypes.SDP, connection.localDescription);
    startTimeout();
  } catch (cause) {
    hangup();
    error.value = deviceError(cause);
  }
}
async function accept() {
  if (!pendingOffer || state.value !== "incoming") return;
  const offer = pendingOffer;
  const currentGeneration = generation;
  state.value = "connecting";
  error.value = "";
  try {
    const stream = await prepareDevices();
    if (!stream || generation !== currentGeneration) return;
    const connection = setupPeer(stream);
    await connection.setRemoteDescription(offer);
    await flushCandidates(connection);
    await connection.setLocalDescription(await connection.createAnswer());
    if (pc !== connection) return;
    signal(WsMsgTypes.ANSWER, connection.localDescription);
  } catch (cause) {
    hangup();
    error.value = deviceError(cause);
  }
}
const service = wsService;
const unsubscribe = [
  service.on("sdp_received", (offer: RTCSessionDescriptionInit, from) => {
    if (active.value) {
      try {
        signal(WsMsgTypes.END_CALL, "busy", from);
      } catch {
        /* offline */
      }
      return;
    }
    error.value = "";
    emit("incoming", from);
    peer = from;
    pendingOffer = offer;
    state.value = "incoming";
    startTimeout();
  }),
  service.on(
    "answer_received",
    async (answer: RTCSessionDescriptionInit, from) => {
      if (from !== peer || !pc || pc.signalingState !== "have-local-offer")
        return;
      try {
        state.value = "connecting";
        await pc.setRemoteDescription(answer);
        await flushCandidates(pc);
      } catch {
        hangup();
        error.value = "连接未能建立，请重新发起通话。";
      }
    },
  ),
  service.on("ice_candidate", async (candidate: RTCIceCandidateInit, from) => {
    if (from !== peer || !active.value) return;
    if (!pc?.remoteDescription) {
      candidates.push(candidate);
      return;
    }
    try {
      await pc.addIceCandidate(candidate);
    } catch {
      /* May arrive after hangup. */
    }
  }),
  service.on("call_ended", (reason, from) => {
    if (from === peer) {
      hangup(false);
      message.info(
        reason === "busy" ? "对方正在通话中，请稍后再试" : "对方已结束通话",
      );
    }
  }),
  service.on("disconnected", () => {
    if (active.value) {
      hangup(false);
      error.value = "消息服务已断开，通话已结束。";
    }
  }),
];
async function toggleTrack(kind: "audio" | "video") {
  if (deviceBusy.value) return;
  if (!localStream.value) {
    await checkDevices();
    if (!localStream.value) return;
  }
  if (kind === "audio") {
    micEnabled.value = !micEnabled.value;
    localStream.value.getAudioTracks().forEach((track) => {
      track.enabled = micEnabled.value;
    });
  } else {
    cameraEnabled.value = !cameraEnabled.value;
    localStream.value.getVideoTracks().forEach((track) => {
      track.enabled = cameraEnabled.value;
    });
  }
}
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await stage.value?.requestFullscreen();
  } catch {
    message.info("当前浏览器暂不支持全屏");
  }
}
watch(
  () => props.user,
  () => {
    if (!active.value && localStream.value) reset();
    error.value = "";
  },
);
watch(
  () => props.online,
  (online) => {
    if (!online && active.value && state.value !== "incoming") {
      hangup();
      error.value = "对方已离线，稍后再聊吧。";
    }
  },
);
onBeforeUnmount(() => {
  disposed = true;
  unsubscribe.forEach((off) => off());
  hangup();
});
</script>
