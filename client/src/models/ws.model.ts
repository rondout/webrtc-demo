/*
 * @Author: shufei.han
 * @Date: 2024-11-11 11:29:23
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-11 16:38:35
 * @FilePath: \webrtc-demo\client\src\models\ws.model.ts
 * @Description: 
 */

import { useUserAction } from "@/hooks/useUserInfo"
import { useMainStore } from "@/stores/main"
import { useMsgStore } from "@/stores/msgStore";

export enum WsMsgTypes {
    CALL = 'call',
    RECEIVE_CALL = 'receive_call',
    ANSWER = 'answer',
    CONNECT_SUCCESS = 'connect_success',
    USER_ONLINE = 'user_online',
    USER_OFFLINE = 'user_offline',
    CHAT_MSG = 'chat_msg',
}

export interface MessageContent {
    from: string;
    to: string;
    content: string;
    time: string | number;
    isSelf?:boolean;
}

export class WsMsgs<T = any> {
    constructor(public type: WsMsgTypes, public data?: T) {
        this.type = type
        this.data = data
    }

    public get content() {
        return JSON.stringify({ type: this.type, data: this.data })
    }
}

export class CallMsgs {
    public from: string
    constructor(public to: string, public content?: string) {
        const { userInfo } = useMainStore()
        this.from = userInfo.username
        return { to, from: this.from, content }
    }
}

export class WebSocketService {
    public ws: WebSocket
    constructor(private callback: (ws?: WebSocket) => void) {
        this.init()
        callback(this.ws)
    }

    private init() {
        this.ws = new WebSocket('ws://localhost:4004');
        this.ws.onmessage = (event) => {
            this.handleMessage(JSON.parse(event.data))
        }
        this.ws.onerror = (error) => {
            console.log('error', error)
        }
        this.ws.onclose = (ev) => {
            console.log('close', ev)
        }
    }

    private handleMessage(data: WsMsgs) {
        const { setUserOnlineStatus } = useUserAction()
        switch (data.type) {
            case WsMsgTypes.CONNECT_SUCCESS:
                this.callback(this.ws)
                return
            case WsMsgTypes.USER_ONLINE:
                setUserOnlineStatus(data.data as string, true)
                return
            case WsMsgTypes.USER_OFFLINE:
                setUserOnlineStatus(data.data as string, false)
                return
            case WsMsgTypes.CHAT_MSG:
                useMsgStore().addChatMsg(data.data as MessageContent)
                return
            case WsMsgTypes.CALL:
                console.log("收到呼叫消息")
                return
        }

    }
}

export let wsConnect: WebSocket;

export const connectWs = (onSuccess?: (ws: WebSocket) => void) => {
    if (wsConnect) {
        return
    }
    new WebSocketService((ws) => {
        wsConnect = ws
        onSuccess?.(ws)
    })
}

export const closeWs = () => {
    wsConnect?.close()
    wsConnect = null
}