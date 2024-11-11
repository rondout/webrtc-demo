<!--
 * @Author: shufei.han
 * @Date: 2024-11-11 12:20:00
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-11 16:32:50
 * @FilePath: \webrtc-demo\client\src\views\ctrls\MessageBox.vue
 * @Description: 
-->
<template>
    <div class="msg-content full-height">
        <div class="flex-start flex-column items-start content-inner full-height">
            <h2>Send Message to {{ props.user }} : </h2>
            <div class="list flex-1">
                <div v-for="(msg, index) in msgStore.currentChatMsgs" :key="index" class="msg-item">
                    <div class="flex-start item" v-if="!msg.isSelf">
                        <div class="name">{{ msg.from }}</div>
                        <div class="content">{{ msg.content }}</div>
                    </div>
                    <div class="flex-start item self" v-else>
                        <div class="content">{{ msg.content }}</div>
                        <div class="name">{{ msg.from }}</div>
                    </div>
                </div>
            </div>
            <div class="footer flex-start full-width">
                <Input v-model:value="state.msg" placeholder="请输入消息" class="flex-1"></Input>
                <Button type="primary" style="margin-left: 8px;" @click="handleSend">发送</Button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { CallMsgs, wsConnect, WsMsgs, WsMsgTypes } from '@/models/ws.model';
import { useMsgStore } from '@/stores/msgStore';
import { Button, Input } from 'ant-design-vue';
import { reactive } from 'vue';

const msgStore = useMsgStore()

const props = defineProps<{ user: string }>()

const state = reactive({
    msg: '',
})

const handleSend = () => {
    if (!state.msg) {
        return
    }
    wsConnect.send(new WsMsgs(WsMsgTypes.CHAT_MSG, new CallMsgs(props.user, state.msg)).content)
    state.msg = ''
}
</script>

<style lang="scss" scoped>
.msg-content {
    padding: 16px 32px;
    box-sizing: border-box;

    .content-inner {
        box-sizing: border-box;
        border: 1px solid var(--primary);
        padding: 8px 16px;
        border-radius: 8px;

        .list {
            padding: 16px 0;
            width: 100%;
            overflow: auto;
            .msg-item {
                background-color: rgba(0,0,0,0.1);
                padding: 8px;
                margin-bottom: 12px;
                border-radius: 8px;
                .name {
                    background: var(--primary);
                    margin-right: 8px;
                    padding: 8px;
                    border-radius: 4px;
                    color:#fff;
                }
                .content{
                    flex: 1;
                    padding: 8px;
                    border-radius: 4px;
                    color: var(--primary);
                    background-color: #fff;
                }
                .self {
                    .name {
                        margin-left: 8px;
                        margin-right: 0;
                    }
                }
            }
        }
    }
}
</style>