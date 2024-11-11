/*
 * @Author: shufei.han
 * @Date: 2024-11-11 17:06:21
 * @LastEditors: shufei.han
 * @LastEditTime: 2024-11-11 17:12:45
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

// export const createPeerConnection = async (localStream: MediaStream, onVideoReceived: (stream: MediaStream) => void) => {
//     const pc =  new RTCPeerConnection(iceConfiguration)
//     localStream.getTracks().forEach(track => pc.addTrack(track, localStream))

//     pc.ontrack = (event) => {
//         const stream = event.streams[0]
//         onVideoReceived(stream)
//     }

//     pc.onicecandidate = (event) => {
//         if (event.candidate) {
            
//         }
//     }
// }