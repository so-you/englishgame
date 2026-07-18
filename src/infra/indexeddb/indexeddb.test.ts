import 'fake-indexeddb/auto'

import { afterEach, describe, expect, it } from 'vitest'

import { createSession } from '../../core/session/create-session'
import { initialSrsState, type RecallLog, type SrsState } from '../../core/srs/model'
import { CET4_MVP_PACK } from '../../data/packs'
import { saveContentPack, listContentPacks } from './content-repository'
import {
  deleteEnglishGameDatabase,
  openEnglishGameDatabase,
} from './database'
import { exportUserData, resetAllData } from './export-data'
import { DATABASE_VERSION, STORE_NAMES, type UserSettings } from './schema'
import {
  getSessionSnapshot,
  saveSessionSnapshot,
} from './session-repository'
import {
  getSrsState,
  listRecallLogs,
  saveRecallAtomically,
} from './srs-repository'
import { getSettings, saveSettings } from './settings-repository'

const databaseNames: string[] = []

function databaseName(label: string): string {
  const name = `english-game-test:${label}:${crypto.randomUUID()}`
  databaseNames.push(name)
  return name
}

function valueOf<T>(result: { ok: true; value: T } | { ok: false; error: { message: string } }): T {
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

afterEach(async () => {
  await Promise.all(databaseNames.splice(0).map(deleteEnglishGameDatabase))
})

describe('IndexedDB persistence', () => {
  it('creates schema version one with every required object store', async () => {
    const database = valueOf(
      await openEnglishGameDatabase({ name: databaseName('schema') }),
    )

    expect(database.version).toBe(DATABASE_VERSION)
    expect(
      STORE_NAMES.every((storeName) => database.objectStoreNames.contains(storeName)),
    ).toBe(true)
    database.close()
  })

  it('rolls back an SRS update when adding its recall log fails', async () => {
    const database = valueOf(
      await openEnglishGameDatabase({ name: databaseName('transaction') }),
    )
    const original: SrsState = {
      ...initialSrsState('unit-1'),
      mastery: 1,
      intervalDays: 1,
      dueAt: 1_800_000_000_000,
    }
    const log: RecallLog = {
      id: 'log-1',
      unitId: 'unit-1',
      sessionId: 'session-1',
      kind: 'vocab-meaning-choice',
      correct: true,
      usedHint: false,
      eligible: true,
      graded: true,
      grade: 'good',
      createdAt: 1_800_000_000_000,
    }
    valueOf(await saveRecallAtomically(database, original, log))

    const rejected = await saveRecallAtomically(
      database,
      { ...original, mastery: 2, intervalDays: 3 },
      log,
    )

    expect(rejected).toMatchObject({
      ok: false,
      error: { code: 'transaction-failed' },
    })
    expect(valueOf(await getSrsState(database, 'unit-1'))).toEqual(original)
    expect(valueOf(await listRecallLogs(database))).toEqual([log])
    database.close()
  })

  it('persists imported content, settings, and an unchanged session snapshot', async () => {
    const database = valueOf(
      await openEnglishGameDatabase({ name: databaseName('repositories') }),
    )
    const importedPack = {
      ...CET4_MVP_PACK,
      id: 'custom:persisted',
      name: '持久化词表',
      stage: 'custom' as const,
      curriculumTags: ['custom'] as const,
      source: {
        kind: 'import' as const,
        name: '持久化词表',
        importedAt: 1_800_000_000_000,
      },
    }
    valueOf(await saveContentPack(database, importedPack))

    const session = valueOf(
      createSession({
        id: 'session-persisted',
        seed: 42,
        pack: CET4_MVP_PACK,
        states: new Map(),
        now: 1_800_000_000_000,
        newUnitQuota: 4,
      }),
    )
    valueOf(await saveSessionSnapshot(database, session))

    const settings: UserSettings = {
      id: 'app',
      newUnitQuota: 3,
      reducedMotion: true,
      showTimingHints: false,
      speechEnabled: false,
    }
    valueOf(await saveSettings(database, settings))

    expect(valueOf(await listContentPacks(database))).toEqual([importedPack])
    expect(
      valueOf(await getSessionSnapshot(database, session.id)),
    ).toEqual(session)
    expect(valueOf(await getSettings(database))).toEqual(settings)
    database.close()
  })

  it('exports a versioned bundle and resets data only after confirmation', async () => {
    const database = valueOf(
      await openEnglishGameDatabase({ name: databaseName('export') }),
    )
    valueOf(await saveContentPack(database, CET4_MVP_PACK))

    const exported = valueOf(await exportUserData(database, 1_900_000_000_000))
    expect(exported).toMatchObject({
      schemaVersion: DATABASE_VERSION,
      exportedAt: 1_900_000_000_000,
      data: {
        contentPacks: [CET4_MVP_PACK],
        srsStates: [],
        recallLogs: [],
        sessionSnapshots: [],
        settings: [],
        diagnosticEvents: [],
      },
    })

    expect(await resetAllData(database, false)).toMatchObject({
      ok: false,
      error: { code: 'confirmation-required' },
    })
    valueOf(await resetAllData(database, true))
    expect(valueOf(await listContentPacks(database))).toEqual([])
    database.close()
  })

  it('returns a recoverable error for a database created by a newer schema', async () => {
    const name = databaseName('future-schema')
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(name, DATABASE_VERSION + 1)
      request.onupgradeneeded = () => request.result.createObjectStore('future')
      request.onsuccess = () => {
        request.result.close()
        resolve()
      }
      request.onerror = () => reject(request.error)
    })

    expect(await openEnglishGameDatabase({ name })).toMatchObject({
      ok: false,
      error: { code: 'unsupported-schema' },
    })
  })
})
