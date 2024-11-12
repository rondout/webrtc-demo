
/*
* @Author: shufei.han
* @Date: 2024-11-11 17:06:21
* @LastEditors: shufei.han
* @LastEditTime: 2024-11-12 17:35:41
* @FilePath: \webrtc-demo\client\src\models\webrtc.model.ts
* @Description: 
*/
import { CallMsgs, WsMsgs, WsMsgTypes } from "./ws.model"

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

export const createPcAndCall = async (targetUser: string, onTrack: (stream: MediaStream) => void) => {
    // 创建pc通信对象
    const pc = createPeerConnection()
    const localStream = await setLocalStreamToPc(pc)
    // try {
    //     localStream = await getMediaStream()
    //     // 获取本地媒体流
    //     // 将本地媒体流添加到pc中
    //     localStream.getTracks().forEach(track => {
    //         pc.addTrack(track, localStream)
    //     })
    // } catch (error) {

    // }
    // 监听track事件
    pc.ontrack = event => {
        const srcObject = event.streams[0]
        onTrack(srcObject)
    }
    // 监听ice事件
    pc.onicecandidate = event => {
        if (event.candidate) {
            // 发送ice信息给目标用户
            new WsMsgs(WsMsgTypes.ICE, new CallMsgs(targetUser, event.candidate)).send()
        }
    }
    // 发送offer给目标用户
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    new WsMsgs(WsMsgTypes.SDP, new CallMsgs(targetUser, pc.localDescription)).send()

    return { pc, localStream }
}

export const handleReceiveCall = async (pc: RTCPeerConnection, targetUser: string, sdp: RTCSessionDescriptionInit, onTrack: (stream: MediaStream) => void) => {
    // 创建pc通信对象
    // const pc = createPeerConnection()
    // 将媒体流添加到pc中
    // 监听track事件
    pc.ontrack = event => {
        const srcObject = event.streams[0]
        onTrack(srcObject)
    }
    await pc.setRemoteDescription(new RTCSessionDescription(sdp))

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    // 发送answer给目标用户
    new WsMsgs(WsMsgTypes.ANSWER, new CallMsgs(targetUser, answer)).send()
}

export const setLocalStreamToPc = async (pc: RTCPeerConnection) => {
    try {
        const localStream = await getMediaStream()
        // 将本地媒体流添加到pc中
        localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream)
        })
        return localStream
    } catch (error) {
        console.log(error);
    }
}