export interface UserSettings {
  microphoneEnabled: boolean;
  cameraEnabled: boolean;
}

export const defaultUserSettings = (): UserSettings => ({
  microphoneEnabled: true,
  cameraEnabled: true,
});
