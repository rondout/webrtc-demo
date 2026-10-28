import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  shallowRef,
  watch,
} from "vue";
import { message } from "ant-design-vue";
import { createPeerConnection, getMediaStream } from "@/models/webrtc.model";
import { useSettingsStore } from "@/stores/settings";
import { useMainStore } from "@/stores/main";
import {
  CallMsgs,
  connectionStatus,
  wsService,
  WsMsgs,
  WsMsgTypes,
} from "@/models/ws.model";

export interface UseWebRtcCallOptions {
  /** 使用 getter 读取组件 props，避免联系人切换后丢失响应性。 */
  user: () => string;
  online: () => boolean;
  /** 收到来电时通知界面切换联系人和视频页。 */
  onIncoming: (user: string) => void;
  /** 通知父组件锁定联系人，防止通话中切换到其他用户。 */
  onActiveChange: (active: boolean) => void;
}

/** 管理一次通话的设备采集、信令协商、媒体替换和资源清理；须在组件 setup 中调用。 */
export function useWebRtcCall(options: UseWebRtcCallOptions) {
  type CallState = "idle" | "calling" | "incoming" | "connecting" | "connected";
  const state = ref<CallState>("idle");
  const localVideo = ref<HTMLVideoElement>();
  const remoteVideo = ref<HTMLVideoElement>();
  /** 本地的stream；浏览器媒体对象使用 shallowRef，保留原生对象身份；流内轨道变更时替换整个流来更新视图。 */
  const localStream = shallowRef<MediaStream>();
  /** 收到的云端的stream */
  const remoteStream = shallowRef<MediaStream>();
  const settings = useSettingsStore();
  const main = useMainStore();
  // 用户身份和服务端偏好都加载完成后才允许操作，避免默认开关提前触发设备申请。
  const settingsReady = computed(
    () => main.getUserInfoFinish && settings.getUserSettingsFinish,
  );
  const micEnabled = computed(() => settings.preferences.microphoneEnabled);
  const cameraEnabled = computed(() => settings.preferences.cameraEnabled);
  const previewActive = ref(false);
  const remoteVideoActive = ref(false);
  // 偏好表示用户想开启设备；live 状态表示实际采集中，两者在权限被拒绝时可能不同。
  const micLive = computed(
    () =>
      !!localStream.value
        ?.getAudioTracks()
        .some((track) => track.readyState === "live" && track.enabled),
  );
  const cameraLive = computed(
    () =>
      !!localStream.value
        ?.getVideoTracks()
        .some((track) => track.readyState === "live" && track.enabled),
  );
  const deviceBusy = ref(false);
  const mediaUpdating = ref(false);
  const controlsDisabled = computed(
    () =>
      deviceBusy.value ||
      mediaUpdating.value ||
      settings.saving ||
      !settingsReady.value,
  );
  const error = ref("");
  const seconds = ref(0);
  const audioBlocked = ref(false);
  let pc: RTCPeerConnection | undefined;
  let audioSender: RTCRtpSender | undefined;
  let videoSender: RTCRtpSender | undefined;
  let peer = "";
  let pendingOffer: RTCSessionDescriptionInit | undefined;
  let candidates: RTCIceCandidateInit[] = [];
  let callTimeout: ReturnType<typeof setTimeout> | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  // 每次清理递增代次；异步权限请求返回后据此判断是否属于已经结束的通话。
  let generation = 0;
  let disposed = false;
  const active = computed(() => state.value !== "idle");
  const duration = computed(
    () =>
      `${String(Math.floor(seconds.value / 60)).padStart(2, "0")}:${String(seconds.value % 60).padStart(2, "0")}`,
  );
  watch(active, (value) => options.onActiveChange(value), { flush: "sync" });

  /** 通过现有 WebSocket 转发 SDP、ICE 或挂断消息，媒体本身由 WebRTC 传输。 */
  function signal(type: WsMsgTypes, content?: unknown, to = peer) {
    new WsMsgs(type, new CallMsgs(to, content)).send();
  }
  /** 将浏览器设备异常转成可操作的中文提示。 */
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
  /** 只采集请求开启且尚未存在的设备；全部关闭时返回空流，不申请权限。 */
  async function prepareDevices(
    audio = micEnabled.value,
    video = cameraEnabled.value,
  ) {
    // 已经存在的轨道（数组，可能有音频和视频）
    const existing =
      localStream.value
        ?.getTracks()
        .filter((track) => track.readyState === "live") || [];
    // 复用已有的存活轨道，开启摄像头时不会再次申请麦克风。
    /** 是否需要向浏览器请求音频，主要看用户设置以及当前是否已经存在音轨 */
    const needAudio =
    // 如果用户设置开启了音频并且已存在的轨道没音轨
      audio && !existing.some((track) => track.kind === "audio");
    /** 是否需要向浏览器请求视频，主要看用户设置以及当前是否已经存在视频轨道 */  
    const needVideo =
      video && !existing.some((track) => track.kind === "video");
    if (!needAudio && !needVideo) {
      // 如果最终算下来不需要请求新的音以及视频，并且本地还没有存储stream，就构造一个新的空的stream，之所以这样做是为了一开始就开启音轨和视频轨道，方便后续通话过程中开启音视频
      localStream.value ||= new MediaStream();
      return localStream.value;
    }
    if (!navigator.mediaDevices?.getUserMedia)
      throw new Error("请通过 localhost 或 HTTPS 访问以启用设备");
    deviceBusy.value = true;
    const currentGeneration = generation;
    try {
      const stream = await getMediaStream({
        audio: needAudio,
        video: needVideo,
      });
      // 用户可能在权限弹窗期间挂断或离开页面，迟到的流必须立即释放。
      if (disposed || currentGeneration !== generation) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      // 新的轨道添加到localStream
      localStream.value = new MediaStream([...existing, ...stream.getTracks()]);
      await nextTick();
      // 本地视频窗口显示本地画面
      if (localVideo.value) localVideo.value.srcObject = localStream.value;
      return localStream.value;
    } finally {
      deviceBusy.value = false;
    }
  }
  /** 只有明确点击检查设备才进入本地预览，采集范围仍遵循已保存的偏好。 */
  async function checkDevices() {
    if (controlsDisabled.value) return;
    if (!micEnabled.value && !cameraEnabled.value) {
      message.info("麦克风和摄像头都已设为关闭，不需要申请设备权限");
      return;
    }
    error.value = "";
    try {
      const stream = await prepareDevices();
      if (stream) {
        previewActive.value = true;
        if (pc) await attachLocalTracks(pc);
      }
    } catch (cause) {
      error.value = navigator.mediaDevices
        ? deviceError(cause)
        : "请通过 localhost 或 HTTPS 访问以启用摄像头和麦克风。";
    }
  }
  /** 结束本次媒体生命周期：关闭连接、计时器和轨道，但不重置用户偏好。 */
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
    audioSender = undefined;
    videoSender = undefined;
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
    previewActive.value = false;
    remoteVideoActive.value = false;
  }
  /** 主动挂断先通知对方；收到对方挂断时传 false，避免相互重复发送。 */
  function hangup(notify = true) {
    if (notify && peer && connectionStatus.value === "connected") {
      try {
        signal(WsMsgTypes.END_CALL);
      } catch {
        // 消息服务已经关闭时继续完成本地清理。
      }
    }
    reset();
  }
  /** 限制等待接听和连接的时间，超时后释放已开启的设备。 */
  function startTimeout() {
    callTimeout = setTimeout(() => {
      hangup();
      error.value = "暂时没有接通，稍后再试试吧。";
    }, 45000);
  }
  /** 尝试播放远端音视频；自动播放受限时让界面提供用户点击播放入口。 */
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
  /** 每次通话只创建一次连接，在此集中绑定网络候选、远端轨道和连接状态事件。 */
  function setupPeer() {
    const connection = createPeerConnection();
    pc = connection;
    // ICE 候选地址经信令转发给对方；对方用它寻找可用的媒体传输路径。
    connection.onicecandidate = (event) => {
      if (event.candidate && connectionStatus.value === "connected")
        signal(WsMsgTypes.ICE, event.candidate.toJSON());
    };
    connection.ontrack = async (event) => {
      if (pc !== connection) return;
      // 预留的接收器可能没有关联流，将音视频轨道合并到同一个流，避免后来的轨道覆盖前者。
      const tracks = remoteStream.value?.getTracks() || [];
      if (!tracks.includes(event.track)) tracks.push(event.track);
      remoteStream.value = new MediaStream(tracks);
      const updateVideo = () => {
        if (pc === connection)
          remoteVideoActive.value = !!remoteStream.value
            ?.getTracks()
            .some(
              (track) =>
                track.kind === "video" &&
                track.readyState === "live" &&
                !track.muted,
            );
      };
      // replaceTrack 不一定再次触发 ontrack；通过轨道恢复/暂停事件更新远端画面。
      event.track.onunmute = updateVideo;
      event.track.onmute = updateVideo;
      event.track.onended = updateVideo;
      updateVideo();
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
  /** 预留音视频收发通道，并将当前轨道（或 null）接入长期保留的 sender。 */
  async function attachLocalTracks(connection: RTCPeerConnection) {
    // 接听方先应用 Offer，再复用浏览器创建的 transceiver，不能另建一套重复通道。
    const reserve = (kind: "audio" | "video") => {
      const transceiver = connection
        .getTransceivers()
        .find((item) => item.receiver.track.kind === kind);
      if (transceiver) {
        transceiver.direction = "sendrecv";
        return transceiver.sender;
      }
      return connection.addTransceiver(kind, { direction: "sendrecv" }).sender;
    };
    audioSender = reserve("audio");
    videoSender = reserve("video");
    const stream = localStream.value || new MediaStream();
    // setStreams 声明轨道的流归属；真正接入发送器依靠 replaceTrack。
    audioSender.setStreams(stream);
    videoSender.setStreams(stream);
    await audioSender.replaceTrack(stream.getAudioTracks()[0] || null);
    await videoSender.replaceTrack(stream.getVideoTracks()[0] || null);
  }
  /** 远端 SDP 设置完成后补入提前收到的 ICE，避免顺序颠倒导致 addIceCandidate 失败。 */
  async function flushCandidates(connection: RTCPeerConnection) {
    const queued = candidates.splice(0);
    for (const candidate of queued) await connection.addIceCandidate(candidate);
  }
  /** 呼叫方：按偏好采集 → 创建连接和通道 → 生成并发送 Offer。 */
  async function call() {
    if (
      !options.user() ||
      !options.online() ||
      active.value ||
      controlsDisabled.value ||
      connectionStatus.value !== "connected"
    )
      return;
    error.value = "";
    peer = options.user();
    state.value = "calling";
    const currentGeneration = generation;
    try {
      // 先去准备本地音视频设备（因为用户可能设置了关闭音视频，也可能没有，如果没有就应该立马获取音视频流）
      const stream = await prepareDevices();
      if (!stream || generation !== currentGeneration) return;
      // 创建PeerConnection
      const connection = setupPeer();
      // 声明音视频预收发能力
      await attachLocalTracks(connection);
      await connection.setLocalDescription(await connection.createOffer());
      if (pc !== connection) return;
      // 通过ws发送sdp
      signal(WsMsgTypes.SDP, connection.localDescription);
      startTimeout();
    } catch (cause) {
      hangup();
      error.value = deviceError(cause);
    }
  }
  /** 接听方：应用 Offer → 复用通道并接入本地轨道 → 生成并发送 Answer。 */
  async function accept() {
    if (!pendingOffer || state.value !== "incoming" || controlsDisabled.value)
      return;
    const offer = pendingOffer;
    const currentGeneration = generation;
    state.value = "connecting";
    error.value = "";
    try {
      const connection = setupPeer();
      await connection.setRemoteDescription(offer);
      await flushCandidates(connection);
      const stream = await prepareDevices();
      if (!stream || generation !== currentGeneration) return;
      await attachLocalTracks(connection);
      await connection.setLocalDescription(await connection.createAnswer());
      if (pc !== connection) return;
      signal(WsMsgTypes.ANSWER, connection.localDescription);
    } catch (cause) {
      hangup();
      error.value = deviceError(cause);
    }
  }
  // 父页面先建立信令服务；每个订阅都保存退订函数，组件销毁时解除。
  const service = wsService;
  const unsubscribe = [
    // 来电阶段只保存 Offer 并展示接听入口，不立即采集设备。
    service.on("sdp_received", (offer: RTCSessionDescriptionInit, from) => {
      if (active.value) {
        try {
          signal(WsMsgTypes.END_CALL, "busy", from);
        } catch {
          // 对方离线时无法通知忙线，本地保持原通话。
        }
        return;
      }
      error.value = "";
      options.onIncoming(from);
      peer = from;
      pendingOffer = offer;
      state.value = "incoming";
      startTimeout();
    }),
    service.on(
      // 只接受当前对端对本地 Offer 的应答，忽略过期或无关信令。
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
    // ICE 可能先于 SDP 到达，暂存后等待远端描述准备完成。
    service.on(
      "ice_candidate",
      async (candidate: RTCIceCandidateInit, from) => {
        if (from !== peer || !active.value) return;
        if (!pc?.remoteDescription) {
          candidates.push(candidate);
          return;
        }
        try {
          await pc.addIceCandidate(candidate);
        } catch {
          // 挂断后可能仍收到在途候选，忽略这种过期消息。
        }
      },
    ),
    // 对方挂断只执行本地清理，不再反向发送挂断。
    service.on("call_ended", (reason, from) => {
      if (from === peer) {
        hangup(false);
        message.info(
          reason === "busy" ? "对方正在通话中，请稍后再试" : "对方已结束通话",
        );
      }
    }),
    // 信令断开时结束本次通话，避免设备持续占用且失去控制通道。
    service.on("disconnected", () => {
      if (active.value) {
        hangup(false);
        error.value = "消息服务已断开，通话已结束。";
      }
    }),
  ];
  /** 先保存偏好；空闲时不碰设备，预览或通话中才对原 sender 执行媒体替换。 */
  async function toggleTrack(kind: "audio" | "video") {
    if (controlsDisabled.value) return;
    const key = kind === "audio" ? "microphoneEnabled" : "cameraEnabled";
    const enabled = !settings.preferences[key];
    const currentGeneration = generation;
    const shouldApply =
      previewActive.value || (active.value && state.value !== "incoming");
    try {
      await settings.save({ ...settings.preferences, [key]: enabled });
    } catch {
      message.error("保存设备偏好失败，请重试");
      return;
    }
    // 保存设置期间也可能挂断；空闲或仅来电时到此返回，不触发权限申请。
    if (disposed || generation !== currentGeneration || !shouldApply) return;
    mediaUpdating.value = true;
    error.value = "";
    deviceBusy.value = true;
    try {
      const sender = kind === "audio" ? audioSender : videoSender;
      if (enabled) {
        const stream = await prepareDevices(kind === "audio", kind === "video");
        if (!stream || generation !== currentGeneration) return;
        const track = stream.getTracks().find((item) => item.kind === kind);
        // 使用最初协商好的 sender，接入同类型轨道，无需重建连接或重新交换 SDP。
        if (sender) await sender.replaceTrack(track);
      } else {
        // 先解除发送，再 stop 释放硬件；保留 transceiver，后续仍可重新接入新轨道。
        if (sender) await sender.replaceTrack(null);
        if (generation !== currentGeneration) return;
        const tracks = localStream.value?.getTracks() || [];
        tracks
          .filter((track) => track.kind === kind)
          .forEach((track) => track.stop());
        localStream.value = new MediaStream(
          tracks.filter((track) => track.kind !== kind),
        );
        if (localVideo.value) localVideo.value.srcObject = localStream.value;
      }
    } catch (cause) {
      if (generation === currentGeneration) error.value = deviceError(cause);
    } finally {
      deviceBusy.value = false;
      mediaUpdating.value = false;
    }
  }
  // 切换联系人时释放旧的本地预览，用户偏好仍由设置 store 保留。
  watch(
    () => options.user(),
    () => {
      if (!active.value && localStream.value) reset();
      error.value = "";
    },
  );
  // 对端离线时及时结束当前呼叫或通话。
  watch(
    () => options.online(),
    (online) => {
      if (!online && active.value && state.value !== "incoming") {
        hangup();
        error.value = "对方已离线，稍后再聊吧。";
      }
    },
  );
  // 页面离开时先解除信令订阅，再通知挂断并释放设备，防止回调继续访问旧视图。
  onBeforeUnmount(() => {
    disposed = true;
    unsubscribe.forEach((off) => off());
    hangup();
  });
  // 只暴露视图需要的状态和操作，连接、sender、ICE 队列保持为 hook 内部实现。
  return {
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
  };
}
