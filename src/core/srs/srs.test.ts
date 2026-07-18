import { describe, expect, it } from 'vitest'

import type { Exercise } from '../learning/model'
import { completeTeaching } from './teaching'
import { DAY_MS, initialSrsState } from './model'
import { recordRecall } from './record-recall'

const NOW = 1_800_000_000_000
const choiceExercise: Exercise = {
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
}

describe('completeTeaching', () => {
  it('introduces L0 as L1 due tomorrow without grading it', () => {
    const result = completeTeaching({
      state: initialSrsState('abandon:leave'),
      now: NOW,
      logId: 'log:teaching',
      sessionId: 'session:1',
    })

    expect(result).toMatchObject({
      state: {
        unitId: 'abandon:leave',
        mastery: 1,
        intervalDays: 1,
        introducedAt: NOW,
        dueAt: NOW + DAY_MS,
      },
      log: {
        id: 'log:teaching',
        kind: 'teaching',
        eligible: false,
        graded: false,
        createdAt: NOW,
      },
    })
  })
})

describe('recordRecall', () => {
  it('records practice before due without changing SRS state', () => {
    const taught = completeTeaching({
      state: initialSrsState('abandon:leave'),
      now: NOW,
      logId: 'log:teaching',
      sessionId: 'session:1',
    }).state

    const result = recordRecall({
      state: taught,
      exercise: choiceExercise,
      correct: true,
      usedHint: false,
      responseMs: 1_200,
      now: NOW + 1_000,
      logId: 'log:practice',
      sessionId: 'session:1',
      encounterId: 'battle:1',
    })

    expect(result).toEqual({
      state: taught,
      log: {
        id: 'log:practice',
        unitId: 'abandon:leave',
        exerciseId: 'abandon:meaning-choice',
        sessionId: 'session:1',
        encounterId: 'battle:1',
        scheduledDueAt: taught.dueAt,
        kind: 'vocab-meaning-choice',
        correct: true,
        usedHint: false,
        responseMs: 1_200,
        eligible: false,
        graded: false,
        createdAt: NOW + 1_000,
      },
    })
  })

  it('grades the first eligible correct recall and schedules L2', () => {
    const taught = completeTeaching({
      state: initialSrsState('abandon:leave'),
      now: NOW,
      logId: 'log:teaching',
      sessionId: 'session:1',
    }).state
    const dueAt = taught.dueAt!

    const result = recordRecall({
      state: taught,
      exercise: choiceExercise,
      correct: true,
      usedHint: false,
      now: dueAt,
      logId: 'log:graded',
      sessionId: 'session:2',
    })

    expect(result).toMatchObject({
      state: {
        mastery: 2,
        intervalDays: 3,
        dueAt: dueAt + 3 * DAY_MS,
        lastGradedDueAt: dueAt,
        lastReviewedAt: dueAt,
        consecutiveCorrect: 1,
      },
      log: {
        scheduledDueAt: dueAt,
        eligible: true,
        graded: true,
        grade: 'good',
      },
    })
  })

  it('does not grade a second session before the new due window', () => {
    const taught = completeTeaching({
      state: initialSrsState('abandon:leave'),
      now: NOW,
      logId: 'log:teaching',
      sessionId: 'session:1',
    }).state
    const dueAt = taught.dueAt!
    const first = recordRecall({
      state: taught,
      exercise: choiceExercise,
      correct: true,
      usedHint: false,
      now: dueAt,
      logId: 'log:first',
      sessionId: 'session:2',
    })

    const repeated = recordRecall({
      state: first.state,
      exercise: choiceExercise,
      correct: true,
      usedHint: false,
      now: dueAt + 1_000,
      logId: 'log:repeat',
      sessionId: 'session:3',
    })

    expect(repeated).toMatchObject({
      state: first.state,
      log: { eligible: false, graded: false },
    })
  })

  it('treats a hinted correct recall as hard without raising mastery', () => {
    const taught = completeTeaching({
      state: initialSrsState('abandon:leave'),
      now: NOW,
      logId: 'log:teaching',
      sessionId: 'session:1',
    }).state
    const dueAt = taught.dueAt!

    const result = recordRecall({
      state: taught,
      exercise: choiceExercise,
      correct: true,
      usedHint: true,
      now: dueAt,
      logId: 'log:hinted',
      sessionId: 'session:2',
    })

    expect(result).toMatchObject({
      state: { mastery: 1, intervalDays: 1, dueAt: dueAt + DAY_MS },
      log: { grade: 'hard', graded: true },
    })
  })

  it('moves an incorrect recall down at most one level and never back to L0', () => {
    const dueAt = NOW
    const l2State = {
      ...initialSrsState('abandon:leave'),
      mastery: 2 as const,
      intervalDays: 3,
      dueAt,
    }

    const result = recordRecall({
      state: l2State,
      exercise: { ...choiceExercise, kind: 'vocab-word-choice' },
      correct: false,
      usedHint: false,
      now: dueAt,
      logId: 'log:wrong',
      sessionId: 'session:2',
    })

    expect(result).toMatchObject({
      state: {
        mastery: 1,
        intervalDays: 1,
        lapses: 1,
        consecutiveCorrect: 0,
      },
      log: { grade: 'again', graded: true },
    })
  })
})
