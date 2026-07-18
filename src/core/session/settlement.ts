import type { SessionState } from './model'

export interface SessionSettlement {
  readonly outcome: 'completed' | 'defeated' | 'in-progress'
  readonly dueUnitCount: number
  readonly dueAttemptedCount: number
  readonly dueCoverage: number
  readonly teachingCount: number
  readonly recallCount: number
  readonly correctCount: number
  readonly incorrectCount: number
  readonly gradedCount: number
  readonly nextDueAt?: number
  readonly difficultUnitIds: readonly string[]
}

export function buildSessionSettlement(
  session: SessionState,
): SessionSettlement {
  const recallLogs = session.logs.filter((log) => log.kind !== 'teaching')
  const dueIds = new Set(session.learningSet.dueUnitIds)
  const attemptedDueIds = new Set(
    recallLogs.filter((log) => dueIds.has(log.unitId)).map((log) => log.unitId),
  )
  const dueUnitCount = dueIds.size
  const dueAtValues = Object.values(session.srsStates)
    .map((state) => state.dueAt)
    .filter((dueAt): dueAt is number => dueAt !== undefined)
  const difficultUnitIds = [
    ...new Set(
      recallLogs
        .filter((log) => log.correct === false)
        .map((log) => log.unitId),
    ),
  ]

  return {
    outcome:
      session.phase === 'settlement'
        ? 'completed'
        : session.phase === 'defeat'
          ? 'defeated'
          : 'in-progress',
    dueUnitCount,
    dueAttemptedCount: attemptedDueIds.size,
    dueCoverage: dueUnitCount === 0 ? 0 : attemptedDueIds.size / dueUnitCount,
    teachingCount: session.logs.length - recallLogs.length,
    recallCount: recallLogs.length,
    correctCount: recallLogs.filter((log) => log.correct === true).length,
    incorrectCount: recallLogs.filter((log) => log.correct === false).length,
    gradedCount: recallLogs.filter((log) => log.graded).length,
    nextDueAt: dueAtValues.length > 0 ? Math.min(...dueAtValues) : undefined,
    difficultUnitIds,
  }
}
