import { describe, expect, it } from 'vitest'

import type { Exercise } from './model'
import { evaluateAnswer } from './evaluate-answer'

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

const spellingExercise: Exercise = {
  id: 'abandon:spelling',
  unitId: 'abandon:leave',
  kind: 'vocab-spelling',
  prompt: '放弃；抛弃',
  answer: { kind: 'text', accepted: ['abandon'] },
  explanation: 'abandon 表示放弃或抛弃。',
  difficulty: 3,
}

const reorderExercise: Exercise = {
  id: 'past:reorder',
  unitId: 'grammar:simple-past',
  kind: 'grammar-reorder',
  prompt: '排列句子',
  answer: {
    kind: 'token-order',
    acceptedOrders: [['I', 'walked', 'home']],
  },
  explanation: '主语后使用过去式 walked。',
  difficulty: 2,
}

describe('evaluateAnswer', () => {
  it('marks the configured choice option as correct', () => {
    expect(evaluateAnswer(choiceExercise, 'leave')).toEqual({ status: 'correct' })
  })

  it('normalizes case and surrounding whitespace for spelling answers', () => {
    expect(evaluateAnswer(spellingExercise, '  Abandon  ')).toEqual({
      status: 'correct',
    })
  })

  it('asks for confirmation instead of accepting a one-edit spelling', () => {
    expect(evaluateAnswer(spellingExercise, 'abandonn')).toEqual({
      status: 'needs-confirmation',
    })
  })

  it('accepts a configured token order after text normalization', () => {
    expect(evaluateAnswer(reorderExercise, [' i ', 'WALKED', 'home'])).toEqual({
      status: 'correct',
    })
  })
})
