import type { Exercise } from '../learning/model'
import { vocabularyExerciseKindsForMastery } from '../learning/select-exercise'
import type { SrsState } from './model'

export function isEligibleForGrading(
  state: SrsState,
  exercise: Exercise,
  now: number,
): boolean {
  if (
    state.mastery === 0 ||
    state.dueAt === undefined ||
    now < state.dueAt ||
    state.lastGradedDueAt === state.dueAt ||
    exercise.unitId !== state.unitId
  ) {
    return false
  }

  return vocabularyExerciseKindsForMastery(state.mastery, true).includes(
    exercise.kind,
  )
}
