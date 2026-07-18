import { validateContentPack } from '../core/content/validate-pack'
import type { ContentPack } from '../core/learning/model'
import { err, ok, type Result } from '../core/shared/result'
import type { SessionState } from '../core/session/model'
import type { SrsState } from '../core/srs/model'
import { BUILTIN_PACKS } from '../data/packs'
import { listContentPacks } from '../infra/indexeddb/content-repository'
import { listSessionSnapshots } from '../infra/indexeddb/session-repository'
import { getSettings } from '../infra/indexeddb/settings-repository'
import { listSrsStates } from '../infra/indexeddb/srs-repository'
import type {
  StorageError,
  UserSettings,
} from '../infra/indexeddb/schema'

export const DEFAULT_SETTINGS: UserSettings = {
  id: 'app',
  newUnitQuota: 4,
  reducedMotion: false,
  showTimingHints: true,
  speechEnabled: true,
}

export interface BootstrapData {
  readonly packs: readonly ContentPack[]
  readonly settings: UserSettings
  readonly srsStates: readonly SrsState[]
  readonly resumableSession?: SessionState
  readonly warnings: readonly string[]
}

export async function loadBootstrapData(
  database: IDBDatabase,
): Promise<Result<BootstrapData, StorageError>> {
  const [packsResult, settingsResult, statesResult, sessionsResult] =
    await Promise.all([
      listContentPacks(database),
      getSettings(database),
      listSrsStates(database),
      listSessionSnapshots(database),
    ])
  for (const result of [
    packsResult,
    settingsResult,
    statesResult,
    sessionsResult,
  ]) {
    if (!result.ok) return err(result.error)
  }
  if (!packsResult.ok || !settingsResult.ok || !statesResult.ok || !sessionsResult.ok) {
    throw new Error('Unreachable bootstrap result state')
  }

  const warnings: string[] = []
  const builtInIds = new Set(BUILTIN_PACKS.map((pack) => pack.id))
  const validCustomPacks = packsResult.value.filter((pack) => {
    if (builtInIds.has(pack.id)) return false
    const violations = validateContentPack(pack)
    if (violations.length > 0) {
      warnings.push(`已忽略损坏的内容包“${pack.name}”：${violations[0]!.message}`)
      return false
    }
    return true
  })
  const resumableSession = sessionsResult.value
    .filter(
      (session) =>
        session.phase !== 'settlement' && session.phase !== 'defeat',
    )
    .sort((left, right) => right.createdAt - left.createdAt)[0]

  return ok({
    packs: [...BUILTIN_PACKS, ...validCustomPacks],
    settings: settingsResult.value ?? DEFAULT_SETTINGS,
    srsStates: statesResult.value,
    resumableSession,
    warnings,
  })
}
