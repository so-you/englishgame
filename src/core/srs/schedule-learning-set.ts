import { MVP_BALANCE } from '../config/mvp-balance'
import type { LearningUnit } from '../learning/model'
import type { SrsState } from './model'

export interface ScheduleLearningSetInput {
  readonly units: readonly LearningUnit[]
  readonly states: ReadonlyMap<string, SrsState>
  readonly now: number
  readonly newUnitQuota: number
}

export interface LearningSetSnapshot {
  readonly unitIds: readonly string[]
  readonly dueUnitIds: readonly string[]
  readonly newUnitIds: readonly string[]
  readonly practiceUnitIds: readonly string[]
}

function isPlayable(unit: LearningUnit): boolean {
  return unit.type === 'grammar' || unit.enrichmentStatus === 'complete'
}

export function scheduleLearningSet({
  units,
  states,
  now,
  newUnitQuota,
}: ScheduleLearningSetInput): LearningSetSnapshot {
  const playableUnits = [
    ...new Map(
      units.filter(isPlayable).map((unit) => [unit.id, unit] as const),
    ).values(),
  ]

  const dueUnitIds = playableUnits
    .filter((unit) => {
      const state = states.get(unit.id)
      return state !== undefined && state.mastery > 0 && state.dueAt !== undefined && state.dueAt <= now
    })
    .sort((left, right) => {
      const leftState = states.get(left.id)!
      const rightState = states.get(right.id)!
      return (
        leftState.dueAt! - rightState.dueAt! ||
        leftState.mastery - rightState.mastery ||
        rightState.lapses - leftState.lapses ||
        left.id.localeCompare(right.id)
      )
    })
    .slice(0, MVP_BALANCE.dueUnitLimit)
    .map((unit) => unit.id)

  const availableSlots = MVP_BALANCE.deckSize - dueUnitIds.length
  const quota = Math.max(
    0,
    Math.min(newUnitQuota, MVP_BALANCE.newUnitQuotaMax, availableSlots),
  )
  const newUnitIds = playableUnits
    .filter((unit) => (states.get(unit.id)?.mastery ?? 0) === 0)
    .slice(0, quota)
    .map((unit) => unit.id)

  const practiceSlots =
    MVP_BALANCE.deckSize - dueUnitIds.length - newUnitIds.length
  const practiceUnitIds = playableUnits
    .filter((unit) => {
      const state = states.get(unit.id)
      return (
        state !== undefined &&
        state.mastery > 0 &&
        (state.dueAt === undefined || state.dueAt > now)
      )
    })
    .sort((left, right) => {
      const leftState = states.get(left.id)!
      const rightState = states.get(right.id)!
      const leftLearnedAt =
        leftState.lastReviewedAt ?? leftState.introducedAt ?? Number.NEGATIVE_INFINITY
      const rightLearnedAt =
        rightState.lastReviewedAt ?? rightState.introducedAt ?? Number.NEGATIVE_INFINITY
      return rightLearnedAt - leftLearnedAt || left.id.localeCompare(right.id)
    })
    .slice(0, practiceSlots)
    .map((unit) => unit.id)

  return {
    unitIds: [...dueUnitIds, ...newUnitIds, ...practiceUnitIds],
    dueUnitIds,
    newUnitIds,
    practiceUnitIds,
  }
}
