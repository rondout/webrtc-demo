/*
* @Author: shufei.han
* @Date: 2024-11-11 15:45:34
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-11 16:30:48
 * @FilePath: \webrtc-demo\client\src\stores\msgStore.ts
* @Description: 
*/
import { mainService } from "@/api/http";
import { type MessageContent } from "@/models/ws.model";
import { defineStore } from "pinia";
import { computed, onMounted, ref } from "vue";
import { useMainStore } from "./main";

export const useMsgStore = defineStore('msg', () => {
    const allChatMsgs = ref<MessageContent[]>([])
    const currentChat = ref<string>()
    const { userInfo } = useMainStore()

    const getAllChatMessages = async () => {
        const messages = await mainService.getAllMessages()
        allChatMsgs.value = messages
    }

    onMounted(() => {
        getAllChatMessages()
    })

    const currentChatMsgs = computed(() => {
        if (!currentChat) {
            return []
        }
        return allChatMsgs.value.filter(msg => {
            // 要么是发送者，要么是接收者
            return (msg.from === currentChat.value && msg.to === userInfo.username)
                || (msg.to === currentChat.value && msg.from === userInfo.username)
        })
    })

    const setCurrentChat = (user: string) => {
        currentChat.value = user
    }

    const addChatMsg = (msg: MessageContent) => {
        allChatMsgs.value.push({...msg, isSelf: msg.from === userInfo.username})
    }

    return { allChatMsgs, currentChatMsgs, setCurrentChat, addChatMsg, currentChat }
})