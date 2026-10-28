# 此刻 Together · WebRTC Demo

Vue 3 + TypeScript + Pinia 的聊天与视频通话练习项目，使用 WebSocket 交换消息与 WebRTC 信令。

## 本地运行

安装根目录、`client`、`server` 的依赖后，在根目录运行：

```sh
pnpm dev:cert
pnpm dev
```

前端地址为 `https://localhost:5173`，后端为 `https://localhost:4004`，HTTPS 和 WSS 共用开发证书。前端 `/api` 和 `/ws` 分别代理到后端 API 与 WebSocket。使用已有 demo 账号登录，在两个独立浏览器会话中分别登录不同账号，即可测试消息和视频通话。

`pnpm dev:cert` 需要 PowerShell 7 (`pwsh`)，生成包含 localhost、计算机名及当前局域网 IPv4 地址的自签名证书，存入已被 Git 忽略的 `.certs/`。首次访问浏览器会显示证书信任提示；脚本不会自动修改系统信任库。仅在本地开发确认后继续访问，也可换成已受信任的开发证书（文件名保持 `dev-cert.pem` 和 `dev-key.pem`）。手机使用局域网 HTTPS 地址时，需要在手机上建立证书信任才能可靠使用摄像头权限。

局域网 IP 改变后，在根目录执行 `pnpm dev:cert -- -Force`（或 `pwsh -NoProfile -File scripts/dev-cert.ps1 -Force`）重新生成，然后重启前后端。Vite 代理的 `secure: false` 只用于接受本地后端的自签名证书，不是生产部署配置。

```sh
cd client
pnpm build
```

构建同时执行 Vue / TypeScript 类型检查。

## 界面与交互

- 桌面端并排显示联系人、视频空间和聊天；小屏切换视频/聊天，通过左侧联系人按钮打开列表。
- 联系人支持搜索，列表显示最近一条消息和真实在线状态。
- Enter 发送消息，Shift + Enter 换行，也可以插入表情。
- 麦克风/摄像头偏好按账号保存在 `server/db/settings.json`，页面每次进入时读取；设置加载完成前不能开启设备或接听/发起通话。
- 通话前切换开关只保存偏好，不请求设备权限。「检查我的设备」只预览偏好中开启的设备，关闭预览会释放设备。
- 建立通话时预留音视频收发通道，根据偏好申请设备。两项关闭也能接通；通话中开启设备通过 `replaceTrack()` 接入原连接，无需重新交换 Offer/Answer。关闭设备时解除发送轨道并停止采集。
- 对方在线时可以发起视频通话；接收方选择接听或拒绝。挂断、离开页面或消息服务断开时释放媒体设备。
- 摄像头和麦克风需要浏览器授权，并通过 localhost 或 HTTPS 访问。

## 代码入口

| 文件 | 职责 |
| --- | --- |
| `client/src/assets/main.css` | 配色、布局、组件样式与响应式规则 |
| `client/src/views/main/MainPage.vue` | 工作区、联系人选择、视图切换 |
| `client/src/views/main/UserList.vue` | 联系人搜索、在线状态、消息预览 |
| `client/src/views/ctrls/MessageBox.vue` | 消息记录、输入与发送 |
| `client/src/views/ctrls/VideoBox.vue` | 视频界面、状态文案和全屏展示 |
| `client/src/hooks/useWebRtcCall.ts` | 设备采集、预留通道、信令协商、轨道替换和资源清理 |
| `client/src/models/ws.model.ts` | WebSocket 状态、消息分发与信令订阅 |
| `client/src/stores/settings.ts` | 用户设备偏好的加载、保存和初始化状态 |
| `server/tools/settings.ts` | 按账号读取设置，串行、原子写入 JSON |
| `client/src/models/webrtc.model.ts` | 媒体采集、RTCPeerConnection 和 STUN 配置 |
| `server/tools/wsServer.ts` | 消息及 SDP、ICE、Answer、挂断信令的转发 |

学习通话流程时，可以从 `useWebRtcCall.ts` 的 `call` 和 `accept` 开始，再看 `attachLocalTracks` 的通道预留、`toggleTrack` 的轨道替换，以及 `setupPeer` 中的 ICE 与远端媒体事件。关键方法和逻辑均有中文注释。

当前采用 STUN 进行连接；跨网段或受限网络可能需要另外配置 TURN 服务。
