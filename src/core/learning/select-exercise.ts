import type { Mastery } from '../srs/model'
import type { ContentPack, Exercise, ExerciseKind } from './model'

export interface SelectExerciseInput {
  readonly pack: ContentPack
  readonly unitId: string
  readonly mastery: Mastery
  readonly recentExerciseIds: readonly string[]
  readonly listeningAvailable: boolean
}

export function vocabularyExerciseKindsForMastery(
  mastery: Mastery,
  listeningAvailable: boolean,
): readonly ExerciseKind[] {
  if (mastery === 1) return ['vocab-meaning-choice']
  if (mastery === 2) return ['vocab-word-choice']
  if (mastery === 3) return ['vocab-spelling']
  if (mastery === 4) {
    return listeningAvailable
      ? ['vocab-listening-spelling', 'vocab-spelling']
      : ['vocab-spelling']
  }
  if (mastery === 5) {
    return ['vocab-spelling', 'vocab-word-choice', 'vocab-meaning-choice']
  }
  return []
}

export function selectExercise(input: SelectExerciseInput): Exercise | undefined {
  const unit = input.pack.units.find((candidate) => candidate.id === input.unitId)
  if (!unit || unit.type !== 'vocab') {
    return undefined
  }

  const preferredKinds: readonly ExerciseKind[] =
    vocabularyExerciseKindsForMastery(input.mastery, input.listeningAvailable)

  for (const kind of preferredKinds) {
    const freshMatch = input.pack.exercises.find(
      (exercise) =>
        exercise.unitId === input.unitId &&
        exercise.kind === kind &&
        !input.recentExerciseIds.includes(exercise.id),
    )
    if (freshMatch) {
      return freshMatch
    }
  }

  for (const kind of preferredKinds) {
    const repeatedMatch = input.pack.exercises.find(
      (exercise) => exercise.unitId === input.unitId && exercise.kind === kind,
    )
    if (repeatedMatch) {
      return repeatedMatch
    }
  }

  return undefined
}
