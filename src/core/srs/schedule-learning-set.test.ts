import { describe, expect, it } from 'vitest'

import type { VocabularyUnit } from '../learning/model'
import { DAY_MS, initialSrsState, type SrsState } from './model'
import { scheduleLearningSet } from './schedule-learning-set'

const NOW = 1_800_000_000_000

function unit(id: string): VocabularyUnit {
  return {
    id,
    type: 'vocab',
    term: id,
    normalizedTerm: id,
    senseId: 'primary',
    definitionZh: `${id} 的释义`,
    curriculumTags: ['cet4'],
    enrichmentStatus: 'complete',
    source: { kind: 'builtin', name: 'test', license: 'CC0-1.0' },
  }
}

function reviewedState(
  unitId: string,
  overrides: Partial<SrsState>,
): SrsState {
  return {
    ...initialSrsState(unitId),
    mastery: 1,
    intervalDays: 1,
    introducedAt: NOW - 10 * DAY_MS,
    dueAt: NOW,
    ...overrides,
  }
}

describe('scheduleLearningSet', () => {
  it('places the oldest due content before new content regardless of input order', () => {
    const units = [unit('new'), unit('due-recent'), unit('due-old')]
    const states = new Map<string, SrsState>([
      [
        'due-recent',
        reviewedState('due-recent', { dueAt: NOW - DAY_MS, mastery: 1 }),
      ],
      [
        'due-old',
        reviewedState('due-old', { dueAt: NOW - 2 * DAY_MS, mastery: 2 }),
      ],
    ])

    expect(
      scheduleLearningSet({ units, states, now: NOW, newUnitQuota: 4 }),
    ).toEqual({
      unitIds: ['due-old', 'due-recent', 'new'],
      dueUnitIds: ['due-old', 'due-recent'],
      newUnitIds: ['new'],
      practiceUnitIds: [],
    })
  })

  it('prioritizes lower mastery and more lapses when due times match', () => {
    const units = [unit('steady'), unit('fragile'), unit('advanced')]
    const states = new Map<string, SrsState>([
      [
        'steady',
        reviewedState('steady', { dueAt: NOW, mastery: 1, lapses: 1 }),
      ],
      [
        'fragile',
        reviewedState('fragile', { dueAt: NOW, mastery: 1, lapses: 3 }),
      ],
      [
        'advanced',
        reviewedState('advanced', { dueAt: NOW, mastery: 3, lapses: 5 }),
      ],
    ])

    const snapshot = scheduleLearningSet({
      units,
      states,
      now: NOW,
      newUnitQuota: 0,
    })

    expect(snapshot.dueUnitIds).toEqual(['fragile', 'steady', 'advanced'])
  })

  it('fills remaining slots with the most recently learned non-due content', () => {
    const units = [unit('older'), unit('introduced'), unit('recent')]
    const states = new Map<string, SrsState>([
      [
        'older',
        reviewedState('older', {
          dueAt: NOW + DAY_MS,
          lastReviewedAt: NOW - 3 * DAY_MS,
        }),
      ],
      [
        'introduced',
        reviewedState('introduced', {
          dueAt: NOW + DAY_MS,
          introducedAt: NOW - 2 * DAY_MS,
          lastReviewedAt: undefined,
        }),
      ],
      [
        'recent',
        reviewedState('recent', {
          dueAt: NOW + DAY_MS,
          lastReviewedAt: NOW - DAY_MS,
        }),
      ],
    ])

    expect(
      scheduleLearningSet({ units, states, now: NOW, newUnitQuota: 0 }),
    ).toEqual({
      unitIds: ['recent', 'introduced', 'older'],
      dueUnitIds: [],
      newUnitIds: [],
      practiceUnitIds: ['recent', 'introduced', 'older'],
    })
  })

  it('excludes unfinished content and never schedules the same unit twice', () => {
    const due = unit('due')
    const pending: VocabularyUnit = {
      ...unit('pending'),
      enrichmentStatus: 'pending',
    }
    const incomplete: VocabularyUnit = {
      ...unit('incomplete'),
      enrichmentStatus: 'incomplete',
    }
    const states = new Map<string, SrsState>([
      ['due', reviewedState('due', { dueAt: NOW })],
    ])

    expect(
      scheduleLearningSet({
        units: [due, pending, due, incomplete, unit('new')],
        states,
        now: NOW,
        newUnitQuota: 4,
      }),
    ).toEqual({
      unitIds: ['due', 'new'],
      dueUnitIds: ['due'],
      newUnitIds: ['new'],
      practiceUnitIds: [],
    })
  })

  it('caps an overloaded queue at eight due and four new units', () => {
    const dueUnits = Array.from({ length: 10 }, (_, index) =>
      unit(`due-${index + 1}`),
    )
    const newUnits = Array.from({ length: 6 }, (_, index) =>
      unit(`new-${index + 1}`),
    )
    const states = new Map<string, SrsState>(
      dueUnits.map((item, index) => [
        item.id,
        reviewedState(item.id, { dueAt: NOW - (index + 1) * DAY_MS }),
      ]),
    )

    const snapshot = scheduleLearningSet({
      units: [...newUnits, ...dueUnits],
      states,
      now: NOW,
      newUnitQuota: 99,
    })

    expect(snapshot.dueUnitIds).toEqual([
      'due-10',
      'due-9',
      'due-8',
      'due-7',
      'due-6',
      'due-5',
      'due-4',
      'due-3',
    ])
    expect(snapshot.newUnitIds).toEqual(['new-1', 'new-2', 'new-3', 'new-4'])
    expect(snapshot.unitIds).toHaveLength(12)
    expect(states.get('due-2')?.dueAt).toBe(NOW - 2 * DAY_MS)
  })

  it('honors a zero new-unit quota and is deterministic for the same input', () => {
    const units = [unit('new-1'), unit('new-2')]
    const input = {
      units,
      states: new Map<string, SrsState>(),
      now: NOW,
      newUnitQuota: 0,
    }

    const first = scheduleLearningSet(input)
    const second = scheduleLearningSet(input)

    expect(first).toEqual({
      unitIds: [],
      dueUnitIds: [],
      newUnitIds: [],
      practiceUnitIds: [],
    })
    expect(second).toEqual(first)
  })
})
