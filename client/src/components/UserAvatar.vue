<script setup lang="ts">
import { computed } from "vue";
const props = withDefaults(
  defineProps<{
    name?: string;
    size?: number;
    online?: boolean;
    status?: boolean;
  }>(),
  { name: "", size: 42 },
);
const colors = ["sage", "sand", "lilac", "rose"];
const color = computed(
  () =>
    colors[
      Array.from(props.name).reduce((sum, c) => sum + c.charCodeAt(0), 0) %
        colors.length
    ],
);
</script>
<template>
  <span
    class="user-avatar"
    :class="color"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      fontSize: `${size * 0.36}px`,
    }"
    aria-hidden="true"
    >{{ name.trim().slice(0, 1).toUpperCase() || "·"
    }}<i v-if="status" class="avatar-status" :class="{ online }"
  /></span>
</template>
