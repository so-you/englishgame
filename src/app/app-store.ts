import { createStore, type StoreApi } from 'zustand/vanilla'

import type { ContentPack } from '../core/learning/model'
import { getPlayableUnits, validateContentPack } from '../core/content/validate-pack'
import { err, ok, type Result } from '../core/shared/result'
import { completeNextTeaching } from '../core/session/complete-teaching'
import { createSession } from '../core/session/create-session'
import type { SessionState } from '../core/session/model'
import {
  prepareOvercharge as prepareCardOvercharge,
  type PendingOvercharge,
  type PrepareOverchargeError,
} from '../core/session/prepare-overcharge'
import {
  reduceSession,
  type SessionAction,
} from '../core/session/session-reducer'
import type { SrsState } from '../core/srs/model'
import type { RecallLog } from '../core/srs/model'
import {
  deleteSessionSnapshot,
  saveSessionProgressAtomically,
  saveSessionSnapshot,
} from '../infra/indexeddb/session-repository'
import { saveSettings } from '../infra/indexeddb/settings-repository'
import {
  exportUserData,
  resetAllData,
  type UserDataExport,
} from '../infra/indexeddb/export-data'
import { saveContentPack } from '../infra/indexeddb/content-repository'
import { MVP_BALANCE } from '../core/config/mvp-balance'
import type { UserSettings } from '../infra/indexeddb/schema'
import type { AppScreen } from './app-screen'
import { screenForSessionPhase } from './app-screen'
import type { BootstrapData } from './bootstrap'
import {
  createDiagnosticEvent,
  recordDiagnosticEvents,
} from '../infra/diagnostics/collector'
import type {
  DiagnosticEvent,
  DiagnosticEventType,
} from '../infra/diagnostics/model'

export interface AppRuntime {
  now(): number
  nextId(): string
  nextSeed(): number
}

export interface AppActionError {
  readonly message: string
}

export type AppActionResult = Result<void, AppActionError>

export interface AppResolveOverchargeRequest {
  readonly pending: PendingOvercharge
  readonly response: string | readonly string[]
  readonly usedHint: boolean
  readonly confirmedNearMatch: boolean
}

export interface AppStoreState {
  readonly screen: AppScreen
  readonly currentTime: number
  readonly packs: readonly ContentPack[]
  readonly settings: UserSettings
  readonly srsStates: readonly SrsState[]
  readonly session?: SessionState
  readonly resumableSession?: SessionState
  readonly warnings: readonly string[]
  readonly error?: string
  readonly continueSession: () => void
  readonly startSession: (packId: string) => Promise<AppActionResult>
  readonly abandonSession: () => Promise<AppActionResult>
  readonly finishSession: () => Promise<AppActionResult>
  readonly updateNewUnitQuota: (quota: number) => Promise<AppActionResult>
  readonly updateSettings: (
    patch: Partial<Omit<UserSettings, 'id' | 'newUnitQuota'>>,
  ) => Promise<AppActionResult>
  readonly saveImportedPack: (pack: ContentPack) => Promise<AppActionResult>
  readonly resetData: (confirmed: boolean) => Promise<AppActionResult>
  readonly completeTeaching: () => Promise<AppActionResult>
  readonly prepareOvercharge: (
    cardId: string,
    listeningAvailable: boolean,
  ) => Result<PendingOvercharge, PrepareOverchargeError | AppActionError>
  readonly resolveOvercharge: (
    request: AppResolveOverchargeRequest,
  ) => Promise<AppActionResult>
  readonly exportData: () => Promise<Result<UserDataExport, AppActionError>>
  readonly dispatchSession: (action: SessionAction) => Promise<AppActionResult>
  readonly navigate: (screen: AppScreen) => void
}

export type AppStore = StoreApi<AppStoreState>

let diagnosticSequence = 0

function diagnosticEvent(
  runtime: AppRuntime,
  type: DiagnosticEventType,
  sessionId: string | undefined,
  payload: Readonly<Record<string, unknown>> = {},
): DiagnosticEvent {
  return createDiagnosticEvent({
    id: `diagnostic:${runtime.nextId()}:${++diagnosticSequence}`,
    type,
    sessionId,
    createdAt: runtime.now(),
    payload,
  })
}

async function persistDiagnostics(
  database: IDBDatabase,
  set: StoreApi<AppStoreState>['setState'],
  events: readonly DiagnosticEvent[],
): Promise<void> {
  if (events.length === 0) return
  const persisted = await recordDiagnosticEvents(database, events)
  if (!persisted.ok) {
    set((state) => ({
      warnings: [...state.warnings, '本地诊断事件未能保存；学习进度不受影响。'],
    }))
  }
}

function completionDiagnostics(
  runtime: AppRuntime,
  before: SessionState,
  after: SessionState,
  action: SessionAction,
  newLog?: RecallLog,
): readonly DiagnosticEvent[] {
  const events: DiagnosticEvent[] = []
  const sessionId = before.id
  if (action.type === 'battle-action' && action.action.type === 'play-card') {
    events.push(
      diagnosticEvent(runtime, 'card_played_direct', sessionId, {
        turn: before.currentBattle?.turn ?? 0,
      }),
    )
  }
  if (action.type === 'resolve-overcharge' && newLog) {
    events.push(
      diagnosticEvent(runtime, 'overcharge_resolved', sessionId, {
        correct: newLog.correct ?? false,
        usedHint: newLog.usedHint,
        eligible: newLog.eligible,
        graded: newLog.graded,
        responseMs: newLog.responseMs ?? 0,
        focusRemaining: after.currentBattle?.player.focus ?? 0,
      }),
    )
    if (before.learningSet.dueUnitIds.includes(newLog.unitId)) {
      events.push(
        diagnosticEvent(runtime, 'due_unit_attempted', sessionId, {
          eligible: newLog.eligible,
          graded: newLog.graded,
        }),
      )
    }
  }
  if (
    before.currentBattle?.status === 'active' &&
    after.currentBattle?.status !== 'active'
  ) {
    events.push(
      diagnosticEvent(runtime, 'battle_completed', sessionId, {
        encounter: before.phase,
        outcome: after.currentBattle?.status ?? 'unknown',
        turn: after.currentBattle?.turn ?? before.currentBattle.turn,
        playerHp: after.currentBattle?.player.hp ?? 0,
      }),
    )
  }
  if (after.currentBattle?.id !== before.currentBattle?.id) {
    events.push(
      diagnosticEvent(runtime, 'battle_started', sessionId, {
        encounter: after.phase,
        playerHp: after.currentBattle?.player.hp ?? 0,
      }),
    )
  }
  if (before.phase !== 'settlement' && after.phase === 'settlement') {
    const recallLogs = after.logs.filter((log) => log.kind !== 'teaching')
    const attemptedDue = new Set(
      recallLogs
        .filter((log) => after.learningSet.dueUnitIds.includes(log.unitId))
        .map((log) => log.unitId),
    ).size
    const dueTotal = after.learningSet.dueUnitIds.length
    events.push(
      diagnosticEvent(runtime, 'session_completed', sessionId, {
        focusUsagePercent: Math.round(
          (recallLogs.length / (MVP_BALANCE.focusPerBattle * 3)) * 100,
        ),
        dueCoveragePercent:
          dueTotal === 0 ? 100 : Math.round((attemptedDue / dueTotal) * 100),
        dueAttempted: attemptedDue,
        dueTotal,
      }),
    )
  }
  return events
}

function failure(
  set: StoreApi<AppStoreState>['setState'],
  message: string,
): AppActionResult {
  set({ screen: 'error', error: message })
  return err({ message })
}

export function createAppStore(
  database: IDBDatabase,
  data: BootstrapData,
  runtime: AppRuntime,
): AppStore {
  return createStore<AppStoreState>((set, get) => ({
    screen: 'home',
    currentTime: runtime.now(),
    packs: data.packs,
    settings: data.settings,
    srsStates: data.srsStates,
    session: undefined,
    resumableSession: data.resumableSession,
    warnings: data.warnings,
    continueSession: () => {
      const resumable = get().resumableSession
      if (resumable) {
        set({
          session: resumable,
          screen: screenForSessionPhase(resumable.phase),
          error: undefined,
        })
      }
    },
    startSession: async (packId) => {
      const pack = get().packs.find((candidate) => candidate.id === packId)
      if (!pack) return failure(set, '找不到所选内容包。')
      const created = createSession({
        id: runtime.nextId(),
        seed: runtime.nextSeed(),
        pack,
        states: new Map(get().srsStates.map((state) => [state.unitId, state])),
        now: runtime.now(),
        newUnitQuota: get().settings.newUnitQuota,
      })
      if (!created.ok) return failure(set, created.error.message)
      const persisted = await saveSessionSnapshot(database, created.value)
      if (!persisted.ok) return failure(set, persisted.error.message)
      await persistDiagnostics(database, set, [
        diagnosticEvent(runtime, 'session_started', created.value.id, {
          newUnitCount: created.value.learningSet.newUnitIds.length,
          dueUnitCount: created.value.learningSet.dueUnitIds.length,
        }),
        ...(created.value.currentBattle
          ? [
              diagnosticEvent(runtime, 'battle_started', created.value.id, {
                encounter: created.value.phase,
                playerHp: created.value.currentBattle.player.hp,
              }),
            ]
          : []),
      ])
      set({
        session: created.value,
        resumableSession: created.value,
        screen: screenForSessionPhase(created.value.phase),
        error: undefined,
      })
      return ok(undefined)
    },
    abandonSession: async () => {
      const session = get().session ?? get().resumableSession
      if (session) {
        const deleted = await deleteSessionSnapshot(database, session.id)
        if (!deleted.ok) return failure(set, deleted.error.message)
        await persistDiagnostics(database, set, [
          diagnosticEvent(runtime, 'session_abandoned', session.id, {
            phase: session.phase,
          }),
        ])
      }
      set({
        session: undefined,
        resumableSession: undefined,
        screen: 'home',
        error: undefined,
      })
      return ok(undefined)
    },
    finishSession: async () => {
      const session = get().session
      if (session) {
        const deleted = await deleteSessionSnapshot(database, session.id)
        if (!deleted.ok) return failure(set, deleted.error.message)
      }
      set({
        session: undefined,
        resumableSession: undefined,
        screen: 'home',
        error: undefined,
      })
      return ok(undefined)
    },
    updateNewUnitQuota: async (quota) => {
      const normalized = Math.max(
        0,
        Math.min(MVP_BALANCE.newUnitQuotaMax, Math.trunc(quota)),
      )
      const settings = { ...get().settings, newUnitQuota: normalized }
      const persisted = await saveSettings(database, settings)
      if (!persisted.ok) return failure(set, persisted.error.message)
      set({ settings, error: undefined })
      return ok(undefined)
    },
    updateSettings: async (patch) => {
      const settings = { ...get().settings, ...patch }
      const persisted = await saveSettings(database, settings)
      if (!persisted.ok) return failure(set, persisted.error.message)
      set({ settings, error: undefined })
      return ok(undefined)
    },
    saveImportedPack: async (pack) => {
      const violations = validateContentPack(pack)
      if (violations.length > 0) {
        return err({ message: `内容包校验失败：${violations[0]!.message}` })
      }
      if (getPlayableUnits(pack).length === 0) {
        return err({ message: '至少需要一个含释义、可以练习的词条。' })
      }
      const persisted = await saveContentPack(database, pack)
      if (!persisted.ok) return failure(set, persisted.error.message)
      await persistDiagnostics(database, set, [
        diagnosticEvent(runtime, 'import_completed', undefined, {
          importedCount: pack.units.length,
          playableCount: getPlayableUnits(pack).length,
          pendingCount: pack.units.length - getPlayableUnits(pack).length,
        }),
      ])
      set((state) => ({
        packs: [...state.packs.filter((candidate) => candidate.id !== pack.id), pack],
        error: undefined,
      }))
      return ok(undefined)
    },
    resetData: async (confirmed) => {
      const reset = await resetAllData(database, confirmed)
      if (!reset.ok) return err({ message: reset.error.message })
      set((state) => ({
        screen: 'home',
        packs: state.packs.filter((pack) => pack.source.kind === 'builtin'),
        settings: {
          id: 'app',
          newUnitQuota: MVP_BALANCE.newUnitQuotaDefault,
          reducedMotion: false,
          showTimingHints: true,
          speechEnabled: true,
        },
        srsStates: [],
        session: undefined,
        resumableSession: undefined,
        warnings: [],
        error: undefined,
      }))
      return ok(undefined)
    },
    completeTeaching: async () => {
      const session = get().session
      if (!session) return failure(set, '当前没有进行中的学习会话。')
      const completed = completeNextTeaching({
        session,
        now: runtime.now(),
        logId: runtime.nextId(),
      })
      if (!completed.ok) return failure(set, completed.error.message)
      const newLog = completed.value.logs.find(
        (log) => !session.logs.some((existing) => existing.id === log.id),
      )
      const persisted = await saveSessionProgressAtomically(
        database,
        completed.value,
        newLog
          ? {
              state: completed.value.srsStates[newLog.unitId]!,
              log: newLog,
            }
          : undefined,
      )
      if (!persisted.ok) return failure(set, persisted.error.message)
      await persistDiagnostics(database, set, [
        diagnosticEvent(runtime, 'teaching_completed', session.id, {
          teachingIndex: completed.value.teachingIndex,
          teachingTotal: completed.value.learningSet.newUnitIds.length,
        }),
        ...(session.phase === 'teaching' && completed.value.currentBattle
          ? [
              diagnosticEvent(runtime, 'battle_started', session.id, {
                encounter: completed.value.phase,
                playerHp: completed.value.currentBattle.player.hp,
              }),
            ]
          : []),
      ])
      set({
        session: completed.value,
        resumableSession: completed.value,
        screen: screenForSessionPhase(completed.value.phase),
        srsStates: Object.values(completed.value.srsStates),
        error: undefined,
      })
      return ok(undefined)
    },
    prepareOvercharge: (cardId, listeningAvailable) => {
      const session = get().session
      if (!session?.currentBattle) {
        return err({ message: '当前没有可过载的战斗。' })
      }
      const prepared = prepareCardOvercharge({
        battle: session.currentBattle,
        cardId,
        pack: session.contentPack,
        states: new Map(
          Object.values(session.srsStates).map((state) => [state.unitId, state]),
        ),
        recentExerciseIds: session.recentExerciseIds,
        listeningAvailable,
        startedAt: runtime.now(),
      })
      if (prepared.ok) {
        void persistDiagnostics(database, set, [
          diagnosticEvent(runtime, 'overcharge_started', session.id, {
            exerciseKind: prepared.value.exercise.kind,
            mastery: session.srsStates[prepared.value.unitId]?.mastery ?? 0,
          }),
        ])
      }
      return prepared
    },
    resolveOvercharge: async (request) => {
      const now = runtime.now()
      return get().dispatchSession({
        type: 'resolve-overcharge',
        ...request,
        responseMs: Math.max(0, now - request.pending.startedAt),
        now,
        logId: runtime.nextId(),
      })
    },
    exportData: () => exportUserData(database, runtime.now()),
    dispatchSession: async (action) => {
      const session = get().session
      if (!session) return failure(set, '当前没有进行中的学习会话。')
      const reduced = reduceSession(session, action)
      if (!reduced.ok) return failure(set, reduced.error.message)
      const newLog = reduced.value.logs.find(
        (log) => !session.logs.some((existing) => existing.id === log.id),
      )
      const persisted = await saveSessionProgressAtomically(
        database,
        reduced.value,
        newLog
          ? { state: reduced.value.srsStates[newLog.unitId]!, log: newLog }
          : undefined,
      )
      if (!persisted.ok) return failure(set, persisted.error.message)
      await persistDiagnostics(
        database,
        set,
        completionDiagnostics(runtime, session, reduced.value, action, newLog),
      )
      set({
        session: reduced.value,
        resumableSession: reduced.value,
        screen:
          action.type === 'resolve-overcharge' &&
          screenForSessionPhase(reduced.value.phase) !== 'battle'
            ? 'battle'
            : screenForSessionPhase(reduced.value.phase),
        srsStates: Object.values(reduced.value.srsStates),
        error: undefined,
      })
      return ok(undefined)
    },
    navigate: (screen) => set({ screen, error: undefined }),
  }))
}
