import { describe, expect, it } from 'vitest'

import type { ContentPack, Exercise, VocabularyUnit } from './model'
import { selectExercise } from './select-exercise'

const unit: VocabularyUnit = {
  id: 'abandon:leave',
  type: 'vocab',
  term: 'abandon',
  normalizedTerm: 'abandon',
  senseId: 'leave',
  definitionZh: '放弃；抛弃',
  curriculumTags: ['cet4'],
  enrichmentStatus: 'complete',
  source: { kind: 'builtin', name: 'test', license: 'CC0-1.0' },
}

function exercise(id: string, kind: Exercise['kind']): Exercise {
  return {
    id,
    unitId: unit.id,
    kind,
    prompt: 'prompt',
    answer: { kind: 'text', accepted: ['abandon'] },
    explanation: 'explanation',
    difficulty: 1,
  }
}

const pack: ContentPack = {
  id: 'test',
  schemaVersion: 1,
  name: 'Test',
  stage: 'university',
  curriculumTags: ['cet4'],
  units: [unit],
  exercises: [
    exercise('meaning', 'vocab-meaning-choice'),
    exercise('word', 'vocab-word-choice'),
    exercise('spelling-a', 'vocab-spelling'),
    exercise('spelling-b', 'vocab-spelling'),
    exercise('listening', 'vocab-listening-spelling'),
  ],
  source: { kind: 'builtin', name: 'test', license: 'CC0-1.0' },
}

describe('selectExercise', () => {
  it('selects a meaning-choice exercise for L1 vocabulary', () => {
    expect(
      selectExercise({
        pack,
        unitId: unit.id,
        mastery: 1,
        recentExerciseIds: [],
        listeningAvailable: true,
      })?.id,
    ).toBe('meaning')
  })

  it.each([
    { listeningAvailable: true, expectedId: 'listening' },
    { listeningAvailable: false, expectedId: 'spelling-a' },
  ])(
    'selects an equally strong L4 exercise when listening availability is $listeningAvailable',
    ({ listeningAvailable, expectedId }) => {
      expect(
        selectExercise({
          pack,
          unitId: unit.id,
          mastery: 4,
          recentExerciseIds: [],
          listeningAvailable,
        })?.id,
      ).toBe(expectedId)
    },
  )

  it('avoids a recently used exercise when an equivalent one is available', () => {
    expect(
      selectExercise({
        pack,
        unitId: unit.id,
        mastery: 3,
        recentExerciseIds: ['spelling-a'],
        listeningAvailable: true,
      })?.id,
    ).toBe('spelling-b')
  })
})
