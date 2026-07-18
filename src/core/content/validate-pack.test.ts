import { describe, expect, it } from 'vitest'

import type { ContentPack } from '../learning/model'
import { getPlayableUnits, validateContentPack } from './validate-pack'

function validVocabularyPack(): ContentPack {
  return {
    id: 'cet4-mvp',
    schemaVersion: 1,
    name: 'CET4 MVP',
    stage: 'university',
    curriculumTags: ['cet4'],
    source: { kind: 'builtin', name: 'MVP test data', license: 'CC0-1.0' },
    units: [
      {
        id: 'abandon:leave',
        type: 'vocab',
        term: 'abandon',
        normalizedTerm: 'abandon',
        senseId: 'leave',
        definitionZh: '放弃；抛弃',
        curriculumTags: ['cet4'],
        enrichmentStatus: 'complete',
        source: { kind: 'builtin', name: 'MVP test data', license: 'CC0-1.0' },
      },
    ],
    exercises: [
      {
        id: 'abandon:meaning-choice',
        unitId: 'abandon:leave',
        kind: 'vocab-meaning-choice',
        prompt: 'abandon',
        options: [
          { id: 'leave', text: '放弃；抛弃' },
          { id: 'keep', text: '保留；保存' },
        ],
        answer: { kind: 'choice', correctOptionId: 'leave' },
        explanation: 'abandon 表示放弃或抛弃。',
        difficulty: 1,
      },
    ],
  }
}

describe('validateContentPack', () => {
  it('accepts a valid atomic vocabulary-sense pack', () => {
    expect(validateContentPack(validVocabularyPack())).toEqual([])
  })

  it('rejects duplicate learning-unit ids', () => {
    const pack = validVocabularyPack()
    const duplicate = pack.units[0]
    const invalid = { ...pack, units: [...pack.units, duplicate] }

    expect(validateContentPack(invalid)).toContainEqual({
      path: 'units[1].id',
      message: 'duplicate learning-unit id: abandon:leave',
    })
  })

  it('rejects exercises that reference a missing learning unit', () => {
    const pack = validVocabularyPack()
    const invalid = {
      ...pack,
      exercises: [{ ...pack.exercises[0], unitId: 'missing:unit' }],
    }

    expect(validateContentPack(invalid)).toContainEqual({
      path: 'exercises[0].unitId',
      message: 'unknown learning-unit id: missing:unit',
    })
  })

  it('keeps pending vocabulary out of the playable collection', () => {
    const pack = validVocabularyPack()
    const pending = {
      ...pack.units[0],
      id: 'await:pending',
      term: 'await',
      normalizedTerm: 'await',
      senseId: 'pending',
      enrichmentStatus: 'pending' as const,
    }
    const withPending = { ...pack, units: [...pack.units, pending] }

    expect(getPlayableUnits(withPending).map((unit) => unit.id)).toEqual([
      'abandon:leave',
    ])
  })

  it('rejects duplicate exercise ids', () => {
    const pack = validVocabularyPack()
    const invalid = {
      ...pack,
      exercises: [...pack.exercises, pack.exercises[0]],
    }

    expect(validateContentPack(invalid)).toContainEqual({
      path: 'exercises[1].id',
      message: 'duplicate exercise id: abandon:meaning-choice',
    })
  })

  it('rejects complete vocabulary without a playable exercise', () => {
    const pack = validVocabularyPack()
    const invalid = { ...pack, exercises: [] }

    expect(validateContentPack(invalid)).toContainEqual({
      path: 'units[0]',
      message: 'complete vocabulary requires at least one exercise',
    })
  })

  it('rejects a built-in grammar concept with fewer than four exercises', () => {
    const exerciseIds = ['past:1', 'past:2', 'past:3']
    const invalid: ContentPack = {
      ...validVocabularyPack(),
      units: [
        {
          id: 'grammar:simple-past',
          type: 'grammar',
          name: '一般过去时',
          explanationZh: '描述过去完成的动作。',
          examples: [{ en: 'I walked home.', zh: '我走回了家。' }],
          exerciseIds,
          curriculumTags: ['junior'],
          source: { kind: 'builtin', name: 'MVP test data', license: 'CC0-1.0' },
        },
      ],
      exercises: exerciseIds.map((id) => ({
        id,
        unitId: 'grammar:simple-past',
        kind: 'grammar-cloze' as const,
        prompt: 'Yesterday I ___ home.',
        answer: { kind: 'text' as const, accepted: ['walked'] },
        explanation: 'Yesterday 表明使用过去时。',
        difficulty: 1 as const,
      })),
    }

    expect(validateContentPack(invalid)).toContainEqual({
      path: 'units[0].exerciseIds',
      message: 'built-in grammar requires at least four distinct exercises',
    })
  })

  it('rejects grammar exercise ids that are not present in the pack', () => {
    const invalid: ContentPack = {
      ...validVocabularyPack(),
      units: [
        {
          id: 'grammar:simple-past',
          type: 'grammar',
          name: '一般过去时',
          explanationZh: '描述过去完成的动作。',
          examples: [{ en: 'I walked home.', zh: '我走回了家。' }],
          exerciseIds: ['past:1', 'past:2', 'past:3', 'past:missing'],
          curriculumTags: ['junior'],
          source: { kind: 'builtin', name: 'MVP test data', license: 'CC0-1.0' },
        },
      ],
      exercises: [],
    }

    expect(validateContentPack(invalid)).toContainEqual({
      path: 'units[0].exerciseIds[3]',
      message: 'unknown exercise id: past:missing',
    })
  })
})
