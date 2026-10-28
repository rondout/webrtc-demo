
/*
* @Author: shufei.han
* @Date: 2024-11-11 17:06:21
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-13 09:40:57
 * @FilePath: \webrtc-demo\client\src\models\webrtc.model.ts
* @Description: 
*/
export const iceConfiguration = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        }
    ]
}

export const getMediaStream = async (constraint: MediaStreamConstraints = {
    video: true,
    audio: true
}) => {
    const stream = await navigator.mediaDevices.getUserMedia(constraint)
    return stream
}

export const createPeerConnection = () => {
    const pc = new RTCPeerConnection(iceConfiguration)
    return pc
}
