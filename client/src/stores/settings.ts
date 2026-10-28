import { defineStore } from "pinia";
import { ref } from "vue";
import { mainService } from "@/api/http";
import {
  defaultUserSettings,
  type UserSettings,
} from "@/models/settings.model";

export const useSettingsStore = defineStore("settings", () => {
  const preferences = ref<UserSettings>(defaultUserSettings());
  const getUserSettingsFinish = ref(false);
  const loading = ref(false);
  const saving = ref(false);
  const loadError = ref("");
  let revision = 0;

  function reset() {
    revision++;
    preferences.value = defaultUserSettings();
    getUserSettingsFinish.value = false;
    loading.value = false;
    saving.value = false;
    loadError.value = "";
  }
  async function load() {
    const request = ++revision;
    loading.value = true;
    getUserSettingsFinish.value = false;
    loadError.value = "";
    try {
      const settings = await mainService.getUserSettings();
      if (request !== revision) return;
      preferences.value = settings;
      getUserSettingsFinish.value = true;
    } catch {
      if (request === revision) loadError.value = "读取设备设置失败，请重试";
    } finally {
      if (request === revision) loading.value = false;
    }
  }
  async function save(next: UserSettings) {
    if (!getUserSettingsFinish.value || saving.value)
      throw new Error("设置尚未就绪");
    const request = revision;
    saving.value = true;
    try {
      const settings = await mainService.saveUserSettings(next);
      if (request === revision) preferences.value = settings;
    } finally {
      if (request === revision) saving.value = false;
    }
  }
  return {
    preferences,
    getUserSettingsFinish,
    loading,
    saving,
    loadError,
    reset,
    load,
    save,
  };
});
