import fs from 'fs/promises'
import { resolve } from 'path'

interface UserSettings {
  microphoneEnabled: boolean;
  cameraEnabled: boolean;
}

const settingsPath = resolve(__dirname, '../db/settings.json')
const defaults = (): UserSettings => ({ microphoneEnabled: true, cameraEnabled: true })
let writeQueue: Promise<void> = Promise.resolve()

async function readSettings(): Promise<Record<string, UserSettings>> {
  try {
    return JSON.parse(await fs.readFile(settingsPath, 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw error
  }
}

export async function getUserSettings(username: string): Promise<UserSettings> {
  const all = await readSettings()
  const stored = Object.prototype.hasOwnProperty.call(all, username) ? all[username] : undefined
  return {
    microphoneEnabled: typeof stored?.microphoneEnabled === 'boolean' ? stored.microphoneEnabled : defaults().microphoneEnabled,
    cameraEnabled: typeof stored?.cameraEnabled === 'boolean' ? stored.cameraEnabled : defaults().cameraEnabled,
  }
}

// Serialize read/modify/write so two users saving together don't overwrite each other.
export function saveUserSettings(username: string, settings: UserSettings): Promise<UserSettings> {
  const operation = writeQueue.then(async () => {
    const all = await readSettings()
    const next = { ...all, [username]: settings }
    const temporaryPath = settingsPath + '.tmp'
    await fs.writeFile(temporaryPath, JSON.stringify(next, null, 2), 'utf8')
    await fs.rename(temporaryPath, settingsPath)
    return settings
  })
  writeQueue = operation.then(() => undefined, () => undefined)
  return operation
}
