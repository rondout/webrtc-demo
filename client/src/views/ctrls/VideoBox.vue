<!--
 * @Author: shufei.han
 * @Date: 2024-11-11 12:20:00
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-11 18:52:15
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
import { iceConfiguration } from "@/models/webrtc.model";
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
    const localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
    });
    currentVideoRef.value.srcObject = localStream;
    const pc = new RTCPeerConnection(iceConfiguration);
    state.pc = pc;
    localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
    });

    pc.ontrack = (event) => {
        alert()
        targetVideoRef.value.srcObject = event.streams[0];
    };

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            wsConnect.send(
                new WsMsgs(WsMsgTypes.ICE, new CallMsgs(props.user, event.candidate)).content
            );
        }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    wsConnect.send(
        new WsMsgs(WsMsgTypes.SDP, new CallMsgs(props.user, pc.localDescription))
            .content
    );
    //
    return pc;
};

const initWsCallCallback = async () => {
    wsService.on("sdp_received", async (sdp) => {
        console.log("客户端收到sdp", sdp);
        if (state.receivePc === null) {
            state.receivePc = new RTCPeerConnection();
            state.receivePc.ontrack = (event) => {
                alert('receive track')
                targetVideoRef.value.srcObject = event.streams[0];
            };
        }
        await state.receivePc.setRemoteDescription(new RTCSessionDescription(sdp));
        if (sdp.type === "offer") {
            // 这里说明是收到邀请
            const answer = await state.receivePc.createAnswer();
            state.receivePc.setLocalDescription(answer);
            // 再把answer发送给对方
            wsConnect.send(
                new WsMsgs(WsMsgTypes.ANSWER, new CallMsgs(props.user, answer)).content
            );
        }
    });
    wsService.on("answer_received", async (answer) => {
        console.log("收到了对方的回答answer:", answer);
        await state.pc.setRemoteDescription(new RTCSessionDescription(answer))
    });
    wsService.on('ice_candidate', async (candidate) => {
        console.log("收到了对方的candidate:", candidate);
        state.receivePc.addIceCandidate(new RTCIceCandidate(candidate))
    }
)

};

onMounted(() => {
    initWsCallCallback();
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
