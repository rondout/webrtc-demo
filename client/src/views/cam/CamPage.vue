<template>
  <Button type="primary" @click="start">Start</Button>
  <Button type="primary" @click="stop">Stop</Button>
  <Button type="primary" @click="pause">Pause</Button>
  <Button type="primary" @click="resume">Resume</Button>
  <Button type="primary" @click="pauseVideo">Pause Video</Button>
  <Button type="primary" @click="resumeVideo">Resume Video</Button>
  <Button type="primary" @click="pauseAudio">Pause Audio</Button>
  <Button type="primary" @click="resumeAudio">Resume Audio</Button>
  <video
    style="background-color: #00000055"
    ref="videoRef"
    autoplay
    playsinline
  ></video>
  <video
    style="background-color: #00000055"
    ref="videoRef2"
    autoplay
    playsinline
  ></video>
  <Checkbox v-model:checked="audio"> Audio </Checkbox>
  <Checkbox v-model:checked="video"> Video </Checkbox>
</template>

<script setup lang="ts">
import { getMediaStream } from "@/models/webrtc.model";
import { Button, Checkbox } from "ant-design-vue";
import { computed, ref, shallowRef } from "vue";

const videoRef = ref<HTMLVideoElement>();
const videoRef2 = ref<HTMLVideoElement>();

const audio = ref(true);
const video = ref(true);

const params = computed(() => ({
  audio: audio.value,
  video: video.value,
}));

const stream = shallowRef<MediaStream>();
// @ts-ignore
window.s = stream;

const videoTrack = computed(() =>
  stream.value?.getVideoTracks()?.find((track) => track.kind === "video"),
);
const audioTrack = computed(() =>
  stream.value?.getAudioTracks()?.find((track) => track.kind === "audio"),
);

const playLocal = async () => {
  videoRef.value!.srcObject = stream.value;
};

const stopPlayLocal = () => {
  videoRef.value?.pause();
  videoRef.value!.srcObject = null;
};

const start = async () => {
  if (stream.value) {
    return;
  }
  const localStream = await getMediaStream(params.value);
  stream.value = localStream;
  playLocal();
};

const stop = () => {
  stream.value?.getTracks().forEach((track) => track.stop());
  stream.value = null;
//   videoRef.value.srcObject = null;
};

const pauseVideo = () => {
  if (!videoTrack.value) return;
  videoTrack.value.enabled = false;
};

const resumeVideo = () => {
  if (!videoTrack.value) return;
  videoTrack.value.enabled = true;
};

const pauseAudio = () => {
  if (!audioTrack.value) return;
  audioTrack.value.enabled = false;
};

const resumeAudio = () => {
  if (!audioTrack.value) return;
  audioTrack.value.enabled = true;
};

const pause = () => {
  if (!stream.value) {
    return;
  }
  pauseVideo();
  pauseAudio();
};

const resume = () => {
  if (!stream.value) {
    return;
  }
  resumeVideo();
  resumeAudio();
};
</script>

<style lang="scss" scoped></style>
