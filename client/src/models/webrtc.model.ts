
/*
* @Author: shufei.han
* @Date: 2024-11-11 17:06:21
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-13 09:40:57
 * @FilePath: \webrtc-demo\client\src\models\webrtc.model.ts
* @Description: 
*/
const turnUrls = String(import.meta.env.VITE_TURN_URLS || '')
    .split(',').map(url => url.trim()).filter(Boolean)

export const iceConfiguration: RTCConfiguration = {
    // 默认允许直连，直连不通时尝试 TURN；测试时可通过环境变量强制中继。
    iceTransportPolicy: import.meta.env.VITE_ICE_RELAY_ONLY === 'true' ? 'relay' : 'all',
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        // WebRTC 使用 credential 字段接收 TURN 密码，不能直接传 password。
        // 固定账号不使用 ttl；它的有效期由 TURN 服务端认证配置决定。
        ...(turnUrls.length ? [{
            urls: turnUrls,
            username: import.meta.env.VITE_TURN_USERNAME,
            credential: import.meta.env.VITE_TURN_PASSWORD,
        }] : []),
    ],
}

export const getMediaStream = async (constraint: MediaStreamConstraints = {
    video: true,
    audio: true
}) => {
    const stream = await navigator.mediaDevices.getUserMedia(constraint)
    return stream
}

export const createPeerConnection = () => {
    console.log('createPeerConnection', iceConfiguration)
    const pc = new RTCPeerConnection(iceConfiguration)
    return pc
}
