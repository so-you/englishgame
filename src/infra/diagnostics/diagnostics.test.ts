import 'fake-indexeddb/auto'

import { afterEach, describe, expect, it } from 'vitest'

import {
  deleteEnglishGameDatabase,
  openEnglishGameDatabase,
} from '../indexeddb/database'
import {
  createDiagnosticEvent,
  listDiagnosticEvents,
  recordDiagnosticEvents,
} from './collector'
import { buildDiagnosticsExport } from './export-diagnostics'
import { calculateMvpMetrics } from './metrics'

const databaseNames: string[] = []

function valueOf<T>(result: { ok: true; value: T } | { ok: false; error: { message: string } }): T {
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

afterEach(async () => {
  await Promise.all(databaseNames.splice(0).map(deleteEnglishGameDatabase))
})

describe('local diagnostics', () => {
  it('drops answers, imported text, nested objects, and other free-form payloads', () => {
    const event = createDiagnosticEvent({
      id: 'event-1',
      type: 'overcharge_resolved',
      sessionId: 'anonymous-session',
      createdAt: 1,
      payload: {
        correct: true,
        focusRemaining: 2,
        response: 'secret answer',
        importedRawText: 'private word list',
        nested: { unsafe: true },
      },
    })

    expect(event.payload).toEqual({ correct: true, focusRemaining: 2 })
    expect(JSON.stringify(event)).not.toContain('secret answer')
    expect(JSON.stringify(event)).not.toContain('private word list')
  })

  it('persists locally and exports aggregate validation metrics without a network sink', async () => {
    const name = `diagnostics:${crypto.randomUUID()}`
    databaseNames.push(name)
    const database = valueOf(await openEnglishGameDatabase({ name }))
    const events = [
      createDiagnosticEvent({ id: '1', type: 'session_started', createdAt: 1 }),
      createDiagnosticEvent({
        id: '2',
        type: 'session_completed',
        createdAt: 2,
        payload: { focusUsagePercent: 67, dueCoveragePercent: 75 },
      }),
      createDiagnosticEvent({
        id: '3',
        type: 'session_abandoned',
        createdAt: 3,
        payload: { phase: 'battle-1' },
      }),
    ]

    valueOf(await recordDiagnosticEvents(database, events))
    expect(valueOf(await listDiagnosticEvents(database))).toEqual(events)
    expect(calculateMvpMetrics(events)).toEqual({
      sessionsStarted: 1,
      sessionsCompleted: 1,
      sessionCompletionPercent: 100,
      averageFocusUsagePercent: 67,
      averageDueCoveragePercent: 75,
      abandonedByPhase: { 'battle-1': 1 },
    })
    expect(buildDiagnosticsExport(events, 4)).toMatchObject({
      schemaVersion: 1,
      exportedAt: 4,
      events,
    })
    database.close()
  })
})
