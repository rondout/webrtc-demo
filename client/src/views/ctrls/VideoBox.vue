<!--
 * @Author: shufei.han
 * @Date: 2024-11-11 12:20:00
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-11 16:39:48
 * @FilePath: \webrtc-demo\client\src\views\ctrls\VideoBox.vue
 * @Description: 
-->
<template>
    <div class="video-content full-height">
        <div class="content-inner full-height">
            <h2>Call Video to {{ props.user }} : </h2>
            <div style="padding: 12px;" class="flex">
                <Button type="primary" @click="handleCall">Call</Button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { CallMsgs, wsConnect, WsMsgs, WsMsgTypes } from '@/models/ws.model';
import { Button } from 'ant-design-vue';

const props = defineProps<{ user: string }>()

const getUserMedia = async () => {
    const result = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    console.log(result);
    
}

const handleCall = async () => {
    await getUserMedia()
    wsConnect.send(new WsMsgs(WsMsgTypes.CALL, new CallMsgs(props.user)).content)
}
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
    }
}
</style>