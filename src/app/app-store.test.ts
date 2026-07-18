import 'fake-indexeddb/auto'

import { afterEach, describe, expect, it } from 'vitest'

import { createSession } from '../core/session/create-session'
import { CET4_MVP_PACK } from '../data/packs'
import {
  listContentPacks,
  saveContentPack,
} from '../infra/indexeddb/content-repository'
import {
  deleteEnglishGameDatabase,
  openEnglishGameDatabase,
} from '../infra/indexeddb/database'
import {
  getSessionSnapshot,
  saveSessionSnapshot,
} from '../infra/indexeddb/session-repository'
import { saveSettings } from '../infra/indexeddb/settings-repository'
import type { UserSettings } from '../infra/indexeddb/schema'
import { createAppStore, type AppRuntime } from './app-store'
import { screenForSessionPhase } from './app-screen'
import { loadBootstrapData } from './bootstrap'

const databaseNames: string[] = []
const runtime: AppRuntime = {
  now: () => 1_800_000_000_000,
  nextId: () => 'generated-session',
  nextSeed: () => 42,
}

function databaseName(label: string): string {
  const name = `english-game-app:${label}:${crypto.randomUUID()}`
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

describe('application orchestration', () => {
  it('maps every domain session phase to an explicit application screen', () => {
    expect(screenForSessionPhase('teaching')).toBe('teaching')
    expect(screenForSessionPhase('battle-1')).toBe('battle')
    expect(screenForSessionPhase('battle-2')).toBe('battle')
    expect(screenForSessionPhase('boss')).toBe('battle')
    expect(screenForSessionPhase('relic-reward')).toBe('relic-reward')
    expect(screenForSessionPhase('heal-reward')).toBe('heal-reward')
    expect(screenForSessionPhase('settlement')).toBe('settlement')
    expect(screenForSessionPhase('defeat')).toBe('defeat')
  })

  it('loads built-in and custom packs, settings, and an unfinished snapshot', async () => {
    const database = valueOf(
      await openEnglishGameDatabase({ name: databaseName('bootstrap') }),
    )
    const customPack = {
      ...CET4_MVP_PACK,
      id: 'custom:loaded',
      name: '已导入词表',
      stage: 'custom' as const,
      curriculumTags: ['custom'] as const,
      source: { kind: 'import' as const, name: '已导入词表', importedAt: 1 },
    }
    valueOf(await saveContentPack(database, customPack))
    const session = valueOf(
      createSession({
        id: 'resumable-session',
        seed: 8,
        pack: CET4_MVP_PACK,
        states: new Map(),
        now: runtime.now(),
        newUnitQuota: 4,
      }),
    )
    valueOf(await saveSessionSnapshot(database, session))
    const settings: UserSettings = {
      id: 'app',
      newUnitQuota: 2,
      reducedMotion: true,
      showTimingHints: false,
      speechEnabled: false,
    }
    valueOf(await saveSettings(database, settings))

    const data = valueOf(await loadBootstrapData(database))
    const store = createAppStore(database, data, runtime)

    expect(store.getState()).toMatchObject({
      screen: 'home',
      packs: [{ id: CET4_MVP_PACK.id }, { id: customPack.id }],
      settings,
      resumableSession: { id: session.id },
    })
    store.getState().continueSession()
    expect(store.getState()).toMatchObject({
      screen: 'teaching',
      session: { id: session.id },
    })
    database.close()
  })

  it('starts, persists, and abandons a session through store actions', async () => {
    const database = valueOf(
      await openEnglishGameDatabase({ name: databaseName('actions') }),
    )
    const store = createAppStore(
      database,
      valueOf(await loadBootstrapData(database)),
      runtime,
    )

    valueOf(await store.getState().startSession(CET4_MVP_PACK.id))
    expect(store.getState()).toMatchObject({
      screen: 'teaching',
      session: { id: 'generated-session' },
    })
    expect(
      valueOf(await getSessionSnapshot(database, 'generated-session')),
    ).toEqual(store.getState().session)

    valueOf(await store.getState().abandonSession())
    expect(store.getState()).toMatchObject({
      screen: 'home',
      session: undefined,
      resumableSession: undefined,
    })
    expect(
      valueOf(await getSessionSnapshot(database, 'generated-session')),
    ).toBeUndefined()
    database.close()
  })

  it('surfaces persistence failures instead of applying uncommitted state', async () => {
    const database = valueOf(
      await openEnglishGameDatabase({ name: databaseName('failure') }),
    )
    const store = createAppStore(
      database,
      valueOf(await loadBootstrapData(database)),
      runtime,
    )
    database.close()

    const result = await store.getState().startSession(CET4_MVP_PACK.id)

    expect(result).toMatchObject({ ok: false })
    expect(store.getState()).toMatchObject({
      screen: 'error',
      session: undefined,
      error: expect.stringContaining('本地数据事务失败'),
    })
  })

  it('prepares and persists a real overcharge recall through the store', async () => {
    const database = valueOf(
      await openEnglishGameDatabase({ name: databaseName('overcharge') }),
    )
    let id = 0
    const battleRuntime: AppRuntime = {
      now: () => 1_800_000_000_000 + id * 1_000,
      nextId: () => `generated-${++id}`,
      nextSeed: () => 20260718,
    }
    const store = createAppStore(
      database,
      valueOf(await loadBootstrapData(database)),
      battleRuntime,
    )

    valueOf(await store.getState().startSession(CET4_MVP_PACK.id))
    while (store.getState().screen === 'teaching') {
      valueOf(await store.getState().completeTeaching())
    }
    const before = store.getState().session!
    const cardId = before.currentBattle!.hand.find((candidateId) =>
      before.cards.some(
        (card) => card.id === candidateId && card.learningUnitId !== undefined,
      ),
    )!
    const pending = valueOf(
      store.getState().prepareOvercharge(cardId, false),
    )
    const response =
      pending.exercise.answer.kind === 'choice'
        ? pending.exercise.answer.correctOptionId
        : pending.exercise.answer.kind === 'text'
          ? pending.exercise.answer.accepted[0]!
          : pending.exercise.answer.acceptedOrders[0]!

    valueOf(
      await store.getState().resolveOvercharge({
        pending,
        response,
        usedHint: false,
        confirmedNearMatch: false,
      }),
    )

    const after = store.getState().session!
    expect(after.logs).toHaveLength(before.logs.length + 1)
    expect(after.currentBattle!.player.focus).toBe(
      before.currentBattle!.player.focus - 1,
    )
    expect(valueOf(await getSessionSnapshot(database, after.id))).toEqual(after)
    database.close()
  })

  it('adds an imported pack immediately and resets local data only after confirmation', async () => {
    const database = valueOf(
      await openEnglishGameDatabase({ name: databaseName('import-reset') }),
    )
    const store = createAppStore(
      database,
      valueOf(await loadBootstrapData(database)),
      runtime,
    )
    const importedPack = {
      ...CET4_MVP_PACK,
      id: 'custom:classroom',
      name: '课堂词表',
      stage: 'custom' as const,
      curriculumTags: ['custom'] as const,
      source: {
        kind: 'import' as const,
        name: '课堂词表',
        importedAt: runtime.now(),
      },
    }

    valueOf(await store.getState().saveImportedPack(importedPack))
    expect(store.getState().packs).toContainEqual(importedPack)
    expect(valueOf(await listContentPacks(database))).toEqual([importedPack])
    valueOf(await store.getState().updateSettings({ reducedMotion: true }))
    expect(store.getState().settings.reducedMotion).toBe(true)

    expect(await store.getState().resetData(false)).toMatchObject({ ok: false })
    expect(store.getState().packs).toContainEqual(importedPack)
    valueOf(await store.getState().resetData(true))
    expect(store.getState()).toMatchObject({
      screen: 'home',
      packs: [{ id: CET4_MVP_PACK.id }],
      srsStates: [],
      settings: { reducedMotion: false },
    })
    expect(valueOf(await listContentPacks(database))).toEqual([])
    database.close()
  })
})
