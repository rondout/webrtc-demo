import { ref } from "vue";
import { useMainStore } from "@/stores/main";
import { useMsgStore } from "@/stores/msgStore";

export enum WsMsgTypes {
  CALL = "call",
  RECEIVE_CALL = "receive_call",
  ANSWER = "answer",
  CONNECT_SUCCESS = "connect_success",
  USER_ONLINE = "user_online",
  USER_OFFLINE = "user_offline",
  CHAT_MSG = "chat_msg",
  ICE = "ice",
  SDP = "sdp",
  END_CALL = "end_call",
}
export interface MessageContent {
  from: string;
  to: string;
  content: string;
  time: string | number;
  isSelf?: boolean;
}
export class WsMsgs<T = unknown> {
  constructor(
    public type: WsMsgTypes,
    public data?: T,
  ) {}
  get content() {
    return JSON.stringify({ type: this.type, data: this.data });
  }
  send() {
    if (wsConnect?.readyState !== WebSocket.OPEN)
      throw new Error("消息服务尚未连接");
    wsConnect.send(this.content);
  }
}
export class CallMsgs<T = string> {
  public from: string;
  constructor(
    public to: string,
    public content?: T,
  ) {
    this.from = useMainStore().userInfo.username;
  }
}
type SignalEvent =
  | "sdp_received"
  | "answer_received"
  | "ice_candidate"
  | "call_ended"
  | "disconnected";
type SignalHandler = (content: any, from: string) => void;
export const connectionStatus = ref<
  "connecting" | "connected" | "disconnected"
>("disconnected");

export class WebSocketService {
  public ws: WebSocket;
  private listeners = new Map<SignalEvent, Set<SignalHandler>>();
  constructor(private callback?: (ws: WebSocket) => void) {
    this.connect();
  }
  connect() {
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) return;
    connectionStatus.value = "connecting";
    const socket = new WebSocket(
      // 同源 WSS 经 Vite 转发到后端，浏览器只需信任前端地址的证书。
      `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`,
    );
    this.ws = socket;
    wsConnect = socket;
    socket.onopen = () => {
      if (wsService === this) {
        connectionStatus.value = "connected";
        this.callback?.(socket);
      }
    };
    socket.onmessage = (event) => {
      try {
        this.handleMessage(JSON.parse(event.data));
      } catch (error) {
        console.error("无法处理消息", error);
      }
    };
    socket.onclose = () => {
      if (this.ws !== socket || wsService !== this) return;
      connectionStatus.value = "disconnected";
      this.emit("disconnected", null, "");
    };
    socket.onerror = () => {
      if (wsService === this) connectionStatus.value = "disconnected";
    };
  }
  private emit(type: SignalEvent, content: unknown, from: string) {
    this.listeners.get(type)?.forEach((listener) => listener(content, from));
  }
  private handleMessage({ type, data }: { type: WsMsgTypes; data: any }) {
    switch (type) {
      case WsMsgTypes.USER_ONLINE:
        useMainStore().updateUser(data, true);
        break;
      case WsMsgTypes.USER_OFFLINE:
        useMainStore().updateUser(data, false);
        break;
      case WsMsgTypes.CHAT_MSG:
        useMsgStore().addChatMsg(data);
        break;
      case WsMsgTypes.SDP:
        this.emit("sdp_received", data.content, data.from);
        break;
      case WsMsgTypes.ANSWER:
        this.emit("answer_received", data.content, data.from);
        break;
      case WsMsgTypes.ICE:
        this.emit("ice_candidate", data.content, data.from);
        break;
      case WsMsgTypes.END_CALL:
        this.emit("call_ended", data.content, data.from);
        break;
    }
  }
  on(type: SignalEvent, listener: SignalHandler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }
}
export let wsConnect: WebSocket;
export let wsService: WebSocketService;
export function connectWs(onSuccess?: (ws: WebSocket) => void) {
  if (wsService) {
    wsService.connect();
    return;
  }
  wsService = new WebSocketService(onSuccess);
}
export function closeWs() {
  wsConnect?.close();
  wsConnect = null;
  wsService = null;
  connectionStatus.value = "disconnected";
}
