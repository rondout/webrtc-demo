/*
 * @Author: shufei.han
 * @Date: 2024-11-11 11:29:23
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-11 18:26:20
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
    ICE = 'ice',
    SDP = 'sdp',
}

export interface MessageContent {
    from: string;
    to: string;
    content: string;
    time: string | number;
    isSelf?: boolean;
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

export class CallMsgs<T = string> {
    public from: string
    constructor(public to: string, public content?: T) {
        const { userInfo } = useMainStore()
        this.from = userInfo.username
    }
}

export class WebSocketService {
    public ws: WebSocket
    private onSdpReceived: (sdp: RTCSessionDescription) => void
    private onAnswerReceived: (answer: RTCSessionDescriptionInit) => void
    private onIceReceived: (ice: RTCIceCandidate) => void

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

    private handleMessage({ data, type }: WsMsgs) {
        const { setUserOnlineStatus } = useUserAction()
        switch (type) {
            case WsMsgTypes.CONNECT_SUCCESS:
                this.callback(this.ws)
                return
            case WsMsgTypes.USER_ONLINE:
                setUserOnlineStatus(data as string, true)
                return
            case WsMsgTypes.USER_OFFLINE:
                setUserOnlineStatus(data as string, false)
                return
            case WsMsgTypes.CHAT_MSG:
                useMsgStore().addChatMsg(data as MessageContent)
                return
            case WsMsgTypes.CALL:
                console.log("收到呼叫消息", data)
                // this.onCallReceived?.(data)
                return
            case WsMsgTypes.SDP:
                console.log("收到sdp消息", data)
                this.onSdpReceived?.(data.content as RTCSessionDescription)
                return
            case WsMsgTypes.ANSWER:
                console.log("收到answer消息", data)
                this.onAnswerReceived?.(data.content as RTCSessionDescriptionInit)
                return
            case WsMsgTypes.ICE:
                console.log("收到ice消息", data)
                this.onIceReceived?.(data.content as RTCIceCandidate)
        }
    }

    public on(type: 'sdp_received' | 'answer_received' | 'ice_candidate', callback: (...data: any) => void) {
        switch (type) {
            case 'sdp_received':
                this.onSdpReceived = callback
                break
            case 'answer_received':
                this.onAnswerReceived = callback
                break
            case 'ice_candidate':
                this.onIceReceived = callback
                break
        }
    }

}

export let wsConnect: WebSocket;
export let wsService: WebSocketService;

export const connectWs = (onSuccess?: (ws: WebSocket) => void) => {
    if (wsConnect) {
        return
    }
    wsService = new WebSocketService((ws) => {
        wsConnect = ws
        onSuccess?.(ws)
    })
}

export const closeWs = () => {
    wsConnect?.close()
    wsConnect = null
    wsService = null
}