const t={iceServers:[{urls:"stun:stun.l.google.com:19302"}]},r=async(e={video:!0,audio:!0})=>await navigator.mediaDevices.getUserMedia(e),o=()=>new RTCPeerConnection(t);export{o as c,r as g};
