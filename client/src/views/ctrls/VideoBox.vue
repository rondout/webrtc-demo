<!--
 * @Author: shufei.han
 * @Date: 2024-11-11 12:20:00
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-12 16:31:46
 * @FilePath: \webrtc-demo\client\src\views\ctrls\VideoBox.vue
 * @Description: 
-->
<template>
    <div class="video-content full-height">
        <div class="content-inner full-height">
            <h2>Call Video to {{ props.user }} :</h2>
            <div style="padding: 12px" class="flex">
                <Button type="primary" @click="handleCall">Call</Button>
            </div>
            <div class="video-box">
                <video controls muted autoplay class="current-video" ref="currentVideoRef"></video>
                <video controls muted autoplay class="target-video" ref="targetVideoRef"></video>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { createPcAndCall, createPeerConnection, getMediaStream, handleReceiveCall, iceConfiguration, setLocalStreamToPc } from "@/models/webrtc.model";
import {
    CallMsgs,
    wsConnect,
    WsMsgs,
    WsMsgTypes,
    wsService,
} from "@/models/ws.model";
import { Button } from "ant-design-vue";
import { onMounted, reactive, ref } from "vue";

const props = defineProps<{ user: string }>();
const currentVideoRef = ref<HTMLVideoElement>();
const targetVideoRef = ref<HTMLVideoElement>();

const state = reactive({
    pc: null as RTCPeerConnection,
    receivePc: null as RTCPeerConnection,
});

const makeCall = async () => {
    const { pc, localStream } = await createPcAndCall(props.user, stream => {
        console.log("对方视频流", stream);
        targetVideoRef.value.srcObject = stream;
    })
    currentVideoRef.value.srcObject = localStream;
    state.pc = pc
};

const initWsCallCallback = async () => {
    wsService.on("sdp_received", async (sdp) => {
        if (state.pc) {
            // 暂不支持多端同时通话
            console.log('暂不支持多端同时通话')
            return
        }
        console.log("客户端收到sdp", sdp);
        state.pc = createPeerConnection()
        await handleReceiveCall(state.pc, props.user, sdp, stream => {
            targetVideoRef.value.srcObject = stream;
        })
        const localStream = await setLocalStreamToPc(state.pc)
        currentVideoRef.value.srcObject = localStream    
    });
};

onMounted(() => {
    initWsCallCallback();
    wsService.on("answer_received", async (answer) => {
        console.log("收到了对方的回答answer:", answer);
        await state.pc?.setRemoteDescription(new RTCSessionDescription(answer))
    });
    wsService.on('ice_candidate', async (candidate) => {
        console.log("收到了对方的candidate:", candidate);
        state.pc?.addIceCandidate(new RTCIceCandidate(candidate))
    })
});

const handleCall = async () => {
    // wsConnect.send(new WsMsgs(WsMsgTypes.CALL, new CallMsgs(props.user)).content);
    await makeCall();
};
</script>

<style lang="scss" scoped>
.video-content {
    padding: 16px 32px;
    box-sizing: border-box;

    .content-inner {
        box-sizing: border-box;
        border: 1px solid var(--primary);
        padding: 8px 16px;
        border-radius: 8px;

        .video-box {
            position: relative;
            min-height: 400px;
            background: #e0e0e0;

            .current-video {
                width: 150px;
                z-index: 2;
                position: absolute;
            }

            .target-video {
                width: 100%;
            }
        }
    }
}
</style>
