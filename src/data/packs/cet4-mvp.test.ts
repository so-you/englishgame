import { describe, expect, it } from 'vitest'

import { validateContentPack } from '../../core/content/validate-pack'
import { vocabularyExerciseKindsForMastery } from '../../core/learning/select-exercise'
import {
  buildCet4MvpPack,
  BUILTIN_PACKS,
  CET4_MVP_PACK,
} from './index'

describe('CET4 MVP content pack', () => {
  it('contains thirty complete atomic vocabulary senses with licensed sources', () => {
    expect(CET4_MVP_PACK.units).toHaveLength(30)
    expect(CET4_MVP_PACK.units.every((unit) => unit.type === 'vocab')).toBe(true)

    for (const unit of CET4_MVP_PACK.units) {
      if (unit.type !== 'vocab') continue
      expect(unit).toMatchObject({
        enrichmentStatus: 'complete',
        source: {
          kind: 'builtin',
          name: 'English Roguelike original CET4 MVP content',
          license: 'CC0-1.0',
        },
      })
      expect(unit.acceptedMeanings?.length).toBeGreaterThan(0)
      expect(unit.phonetic).toBeTruthy()
      expect(unit.partOfSpeech).toBeTruthy()
      expect(unit.example).toBeTruthy()
      expect(unit.exampleZh).toBeTruthy()
    }
  })

  it('provides deterministic L1 to L4 exercises with same-part-of-speech distractors', () => {
    expect(CET4_MVP_PACK.exercises).toHaveLength(120)
    const unitsById = new Map(CET4_MVP_PACK.units.map((unit) => [unit.id, unit]))

    for (const unit of CET4_MVP_PACK.units) {
      if (unit.type !== 'vocab') continue
      const exerciseKinds = new Set(
        CET4_MVP_PACK.exercises
          .filter((exercise) => exercise.unitId === unit.id)
          .map((exercise) => exercise.kind),
      )
      for (const mastery of [1, 2, 3, 4] as const) {
        expect(
          vocabularyExerciseKindsForMastery(mastery, true).some((kind) =>
            exerciseKinds.has(kind),
          ),
        ).toBe(true)
      }

      const choices = CET4_MVP_PACK.exercises.filter(
        (exercise) =>
          exercise.unitId === unit.id && exercise.answer.kind === 'choice',
      )
      for (const exercise of choices) {
        expect(exercise.options).toHaveLength(4)
        for (const option of exercise.options ?? []) {
          const optionUnit = unitsById.get(option.id)
          expect(optionUnit?.type).toBe('vocab')
          if (optionUnit?.type === 'vocab') {
            expect(optionUnit.partOfSpeech).toBe(unit.partOfSpeech)
          }
        }
      }
    }

    expect(buildCet4MvpPack()).toEqual(buildCet4MvpPack())
  })

  it('passes domain validation and is registered as a built-in pack', () => {
    expect(validateContentPack(CET4_MVP_PACK)).toEqual([])
    expect(BUILTIN_PACKS).toContain(CET4_MVP_PACK)
  })
})
