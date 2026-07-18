import type { ContentPack, LearningUnit } from '../learning/model'

export interface ContentViolation {
  readonly path: string
  readonly message: string
}

export function validateContentPack(pack: ContentPack): ContentViolation[] {
  const violations: ContentViolation[] = []
  const unitIds = new Set<string>()

  pack.units.forEach((unit, index) => {
    if (unitIds.has(unit.id)) {
      violations.push({
        path: `units[${index}].id`,
        message: `duplicate learning-unit id: ${unit.id}`,
      })
    }
    unitIds.add(unit.id)
  })

  const exerciseIds = new Set<string>()
  const exerciseCountByUnit = new Map<string, number>()
  pack.exercises.forEach((exercise, index) => {
    if (exerciseIds.has(exercise.id)) {
      violations.push({
        path: `exercises[${index}].id`,
        message: `duplicate exercise id: ${exercise.id}`,
      })
    }
    exerciseIds.add(exercise.id)
    exerciseCountByUnit.set(
      exercise.unitId,
      (exerciseCountByUnit.get(exercise.unitId) ?? 0) + 1,
    )

    if (!unitIds.has(exercise.unitId)) {
      violations.push({
        path: `exercises[${index}].unitId`,
        message: `unknown learning-unit id: ${exercise.unitId}`,
      })
    }

  })

  pack.units.forEach((unit, index) => {
    if (
      unit.type === 'vocab' &&
      unit.enrichmentStatus === 'complete' &&
      (exerciseCountByUnit.get(unit.id) ?? 0) === 0
    ) {
      violations.push({
        path: `units[${index}]`,
        message: 'complete vocabulary requires at least one exercise',
      })
    }

    if (
      unit.type === 'grammar' &&
      unit.source.kind === 'builtin' &&
      new Set(unit.exerciseIds).size < 4
    ) {
      violations.push({
        path: `units[${index}].exerciseIds`,
        message: 'built-in grammar requires at least four distinct exercises',
      })
    }

    if (unit.type === 'grammar') {
      unit.exerciseIds.forEach((exerciseId, exerciseIndex) => {
        if (!exerciseIds.has(exerciseId)) {
          violations.push({
            path: `units[${index}].exerciseIds[${exerciseIndex}]`,
            message: `unknown exercise id: ${exerciseId}`,
          })
        }
      })
    }
  })

  return violations
}

export function getPlayableUnits(pack: ContentPack): LearningUnit[] {
  return pack.units.filter(
    (unit) => unit.type === 'grammar' || unit.enrichmentStatus === 'complete',
  )
}
