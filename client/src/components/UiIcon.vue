<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 });
const paths: Record<string, string> = {
  chat: "M4 4h16v12H9l-5 4V4Z",
  video: "M3 6h12v12H3z M15 10l6-4v12l-6-4",
  cameraOff: "M3 3l18 18 M10 6h5v5 M15 10l6-4v12l-3-2 M6 6H3v12h12v-3",
  people:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87",
  search: "M21 21l-5-5 M18 10a8 8 0 1 0-16 0 8 8 0 0 0 16 0",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  mic: "M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5Z M5 10v2a7 7 0 0 0 14 0v-2 M12 19v3 M8 22h8",
  micOff:
    "M3 3l18 18 M9 9v3a3 3 0 0 0 5 2 M9 4a3 3 0 0 1 6 1v5 M5 10v2a7 7 0 0 0 12 5 M19 10v2 M12 19v3 M8 22h8",
  smile:
    "M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0 M8 14q4 5 8 0 M8 8h.01 M16 8h.01",
  expand: "M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5",
  send: "M21 3L9 15 M21 3l-6 18-6-6-6-6 18-6Z",
  check: "M4 12l5 5L20 6",
  logout: "M9 4H4v16h5 M9 12h12 M16 7l5 5-5 5",
  phone: "M4 15c4-5 12-5 16 0v4h-5v-3a10 10 0 0 0-6 0v3H4v-4Z",
  close: "M6 6l12 12 M6 18L18 6",
  headphones: "M3 14v-3a9 9 0 0 1 18 0v3 M3 13h4v8H3z M17 13h4v8h-4z",
  lock: "M7 10V7a5 5 0 0 1 10 0v3 M5 10h14v11H5z M12 14v3",
  refresh: "M20 7v5h-5 M4 17v-5h5 M6 6a8 8 0 0 1 14 6 M18 18a8 8 0 0 1-14-6",
};
</script>
<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.65"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] || paths.chat" />
  </svg>
</template>
