# 此刻 Together · WebRTC Demo

Vue 3 + TypeScript + Pinia 的聊天与视频通话练习项目，使用 WebSocket 交换消息与 WebRTC 信令。

## 本地运行

安装根目录、`client`、`server` 的依赖后，在根目录运行：

```sh
pnpm dev
```

前端默认地址为 `http://localhost:5173`，消息服务端口为 `4004`。使用已有 demo 账号登录，在两个独立浏览器会话中分别登录不同账号，即可测试消息和视频通话。

```sh
cd client
pnpm build
```

构建同时执行 Vue / TypeScript 类型检查。

## 界面与交互

- 桌面端并排显示联系人、视频空间和聊天；小屏切换视频/聊天，通过左侧联系人按钮打开列表。
- 联系人支持搜索，列表显示最近一条消息和真实在线状态。
- Enter 发送消息，Shift + Enter 换行，也可以插入表情。
- 「检查我的设备」开启本地预览，可切换麦克风和摄像头，关闭预览会释放设备。
- 对方在线时可以发起视频通话；接收方选择接听或拒绝。挂断、离开页面或消息服务断开时释放媒体设备。
- 摄像头和麦克风需要浏览器授权，并通过 localhost 或 HTTPS 访问。

## 代码入口

| 文件 | 职责 |
| --- | --- |
| `client/src/assets/main.css` | 配色、布局、组件样式与响应式规则 |
| `client/src/views/main/MainPage.vue` | 工作区、联系人选择、视图切换 |
| `client/src/views/main/UserList.vue` | 联系人搜索、在线状态、消息预览 |
| `client/src/views/ctrls/MessageBox.vue` | 消息记录、输入与发送 |
| `client/src/views/ctrls/VideoBox.vue` | 设备预览、来电、协商、通话控制和清理 |
| `client/src/models/ws.model.ts` | WebSocket 状态、消息分发与信令订阅 |
| `client/src/models/webrtc.model.ts` | 媒体采集、RTCPeerConnection 和 STUN 配置 |
| `server/tools/wsServer.ts` | 消息及 SDP、ICE、Answer、挂断信令的转发 |

学习通话流程时，可以从 `VideoBox.vue` 的 `call` 和 `accept` 开始，再看 `setupPeer` 中的 ICE 与远端媒体事件。

当前采用 STUN 进行连接；跨网段或受限网络可能需要另外配置 TURN 服务。
