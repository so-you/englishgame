import { MVP_BALANCE } from '../../core/config/mvp-balance'
import type { SessionState } from '../../core/session/model'

export interface SettlementSummary {
  readonly dueAttempted: number
  readonly dueTotal: number
  readonly dueCoveragePercent: number
  readonly focusUsed: number
  readonly focusCapacity: number
  readonly focusUsagePercent: number
  readonly directCorrect: number
  readonly hintedCorrect: number
  readonly incorrect: number
  readonly difficultUnits: readonly {
    readonly unitId: string
    readonly label: string
    readonly incorrectCount: number
  }[]
  readonly nextReviewAt?: number
}

function unitLabel(session: SessionState, unitId: string): string {
  const unit = session.contentPack.units.find((candidate) => candidate.id === unitId)
  if (unit?.type === 'vocab') return unit.term
  if (unit?.type === 'grammar') return unit.name
  return unitId
}

export function buildSettlementSummary(
  session: SessionState,
): SettlementSummary {
  const recallLogs = session.logs.filter((log) => log.kind !== 'teaching')
  const dueIds = new Set(session.learningSet.dueUnitIds)
  const attemptedDueIds = new Set(
    recallLogs
      .filter((log) => dueIds.has(log.unitId))
      .map((log) => log.unitId),
  )
  const encounterCount = new Set(
    recallLogs.map((log) => log.encounterId).filter(Boolean),
  ).size
  const focusCapacity =
    MVP_BALANCE.focusPerBattle * Math.max(encounterCount, session.phase === 'settlement' ? 3 : 1)
  const incorrectByUnit = new Map<string, number>()
  for (const log of recallLogs) {
    if (log.correct === false) {
      incorrectByUnit.set(log.unitId, (incorrectByUnit.get(log.unitId) ?? 0) + 1)
    }
  }
  const nextReviewAt = Object.values(session.srsStates)
    .map((state) => state.dueAt)
    .filter((dueAt): dueAt is number => dueAt !== undefined)
    .sort((left, right) => left - right)[0]

  return {
    dueAttempted: attemptedDueIds.size,
    dueTotal: dueIds.size,
    dueCoveragePercent:
      dueIds.size === 0 ? 100 : Math.round((attemptedDueIds.size / dueIds.size) * 100),
    focusUsed: recallLogs.length,
    focusCapacity,
    focusUsagePercent:
      focusCapacity === 0 ? 0 : Math.round((recallLogs.length / focusCapacity) * 100),
    directCorrect: recallLogs.filter(
      (log) => log.correct === true && !log.usedHint,
    ).length,
    hintedCorrect: recallLogs.filter(
      (log) => log.correct === true && log.usedHint,
    ).length,
    incorrect: recallLogs.filter((log) => log.correct === false).length,
    difficultUnits: [...incorrectByUnit.entries()]
      .map(([unitId, incorrectCount]) => ({
        unitId,
        label: unitLabel(session, unitId),
        incorrectCount,
      }))
      .sort((left, right) => right.incorrectCount - left.incorrectCount),
    nextReviewAt,
  }
}
