import { describe, expect, it } from 'vitest'

import { createBattle } from '../battle/create-battle'
import type { BattleState, CombatCardInstance } from '../battle/model'
import { reduceBattle } from '../battle/reduce-battle'
import type { ContentPack, VocabularyUnit } from '../learning/model'
import { DAY_MS, initialSrsState, type SrsState } from '../srs/model'
import { prepareOvercharge } from './prepare-overcharge'
import { resolveOvercharge } from './resolve-overcharge'

const NOW = 1_800_000_000_000

const vocabulary: VocabularyUnit = {
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

const pack: ContentPack = {
  id: 'pack-1',
  schemaVersion: 1,
  name: '测试词包',
  stage: 'university',
  curriculumTags: ['cet4'],
  units: [vocabulary],
  exercises: [
    {
      id: 'abandon:meaning-1',
      unitId: vocabulary.id,
      kind: 'vocab-meaning-choice',
      prompt: 'abandon',
      options: [
        { id: 'leave', text: '放弃；抛弃' },
        { id: 'keep', text: '保留' },
      ],
      answer: { kind: 'choice', correctOptionId: 'leave' },
      explanation: 'abandon 表示放弃或抛弃。',
      difficulty: 1,
    },
    {
      id: 'abandon:meaning-2',
      unitId: vocabulary.id,
      kind: 'vocab-meaning-choice',
      prompt: 'Which meaning matches abandon?',
      options: [
        { id: 'leave', text: '放弃；抛弃' },
        { id: 'keep', text: '保留' },
      ],
      answer: { kind: 'choice', correctOptionId: 'leave' },
      explanation: 'abandon 表示放弃或抛弃。',
      difficulty: 1,
    },
  ],
  source: { kind: 'builtin', name: 'test', license: 'CC0-1.0' },
}

function card(learningUnitId?: string): CombatCardInstance {
  return {
    id: 'card-1',
    templateId: 'strike',
    learningUnitId,
    sessionId: 'session-1',
    upgraded: false,
  }
}

function battleWith(
  boundCard: CombatCardInstance,
  relicIds: readonly string[] = [],
): BattleState {
  const result = createBattle({
    id: 'battle-1',
    sessionId: 'session-1',
    enemyId: 'ink-blob',
    cards: [boundCard],
    relicIds,
    seed: 4,
  })
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

function dueState(overrides: Partial<SrsState> = {}): SrsState {
  return {
    ...initialSrsState(vocabulary.id),
    mastery: 1,
    intervalDays: 1,
    introducedAt: NOW - 2 * DAY_MS,
    dueAt: NOW,
    ...overrides,
  }
}

function preparedFor(battle: BattleState, state: SrsState) {
  const prepared = prepareOvercharge({
    battle,
    cardId: battle.hand[0]!,
    pack,
    states: new Map([[vocabulary.id, state]]),
    recentExerciseIds: [],
    listeningAvailable: true,
    startedAt: NOW - 1_000,
  })
  if (!prepared.ok) throw new Error(prepared.error.message)
  return prepared.value
}

describe('prepareOvercharge', () => {
  it('rejects neutral cards and a depleted focus budget', () => {
    const neutralBattle = battleWith(card())
    const states = new Map([[vocabulary.id, dueState()]])

    expect(
      prepareOvercharge({
        battle: neutralBattle,
        cardId: neutralBattle.hand[0]!,
        pack,
        states,
        recentExerciseIds: [],
        listeningAvailable: true,
        startedAt: NOW,
      }),
    ).toMatchObject({ ok: false, error: { code: 'neutral-card' } })

    const boundBattle = battleWith(card(vocabulary.id))
    const noFocus = {
      ...boundBattle,
      player: { ...boundBattle.player, focus: 0 },
    }
    expect(
      prepareOvercharge({
        battle: noFocus,
        cardId: noFocus.hand[0]!,
        pack,
        states,
        recentExerciseIds: [],
        listeningAvailable: true,
        startedAt: NOW,
      }),
    ).toMatchObject({ ok: false, error: { code: 'no-focus' } })
  })

  it('locks the selected exercise before an answer is submitted', () => {
    const battle = battleWith(card(vocabulary.id))

    const result = prepareOvercharge({
      battle,
      cardId: battle.hand[0]!,
      pack,
      states: new Map([[vocabulary.id, dueState()]]),
      recentExerciseIds: ['abandon:meaning-1'],
      listeningAvailable: true,
      startedAt: NOW,
    })

    expect(result).toMatchObject({
      ok: true,
      value: {
        battleId: battle.id,
        cardId: 'card-1',
        unitId: vocabulary.id,
        exercise: { id: 'abandon:meaning-2' },
        startedAt: NOW,
      },
    })
  })
})

describe('resolveOvercharge', () => {
  it('spends focus, applies a correct bonus, and records an eligible recall', () => {
    const battle = battleWith(card(vocabulary.id))
    const state = dueState()

    const result = resolveOvercharge({
      pending: preparedFor(battle, state),
      battle,
      state,
      response: 'leave',
      usedHint: false,
      responseMs: 1_250,
      now: NOW,
      logId: 'log-1',
    })

    expect(result).toMatchObject({
      ok: true,
      value: {
        status: 'resolved',
        battle: {
          enemy: { hp: 19 },
          player: { focus: 2, fluency: 1, block: 2 },
        },
        srsState: { mastery: 2 },
        log: {
          correct: true,
          usedHint: false,
          responseMs: 1_250,
          graded: true,
          grade: 'good',
        },
      },
    })
  })

  it('keeps the full base effect on a wrong answer and lowers fluency by at most one', () => {
    const created = battleWith(card(vocabulary.id))
    const battle = {
      ...created,
      player: { ...created.player, fluency: 1 },
    }
    const state = dueState()

    const result = resolveOvercharge({
      pending: preparedFor(battle, state),
      battle,
      state,
      response: 'keep',
      usedHint: false,
      now: NOW,
      logId: 'log-wrong',
    })

    expect(result).toMatchObject({
      ok: true,
      value: {
        status: 'resolved',
        battle: {
          enemy: { hp: 22 },
          player: { focus: 2, fluency: 0 },
        },
        srsState: { mastery: 1, lapses: 1 },
        log: { correct: false, grade: 'again' },
      },
    })
  })

  it('gives a smaller bonus and a hard grade after a hinted correct answer', () => {
    const battle = battleWith(card(vocabulary.id))
    const state = dueState()

    const result = resolveOvercharge({
      pending: preparedFor(battle, state),
      battle,
      state,
      response: 'leave',
      usedHint: true,
      now: NOW,
      logId: 'log-hint',
    })

    expect(result).toMatchObject({
      ok: true,
      value: {
        status: 'resolved',
        battle: { enemy: { hp: 21 }, player: { focus: 2, fluency: 1 } },
        srsState: { mastery: 1 },
        log: { correct: true, usedHint: true, grade: 'hard' },
      },
    })
  })

  it('turns a full fluency threshold into one energy on the next turn', () => {
    const created = battleWith(card(vocabulary.id))
    const battle = {
      ...created,
      player: { ...created.player, fluency: 2 },
    }
    const state = dueState()
    const resolved = resolveOvercharge({
      pending: preparedFor(battle, state),
      battle,
      state,
      response: 'leave',
      usedHint: false,
      now: NOW,
      logId: 'log-fluency',
    })
    if (!resolved.ok || resolved.value.status !== 'resolved') {
      throw new Error('expected a resolved overcharge')
    }

    expect(resolved.value.battle.player).toMatchObject({
      fluency: 0,
      pendingEnergy: 1,
    })
    const nextTurn = reduceBattle(resolved.value.battle, { type: 'end-turn' })
    if (!nextTurn.ok) throw new Error(nextTurn.error.message)
    expect(nextTurn.value.state.player.energy).toBe(4)
    expect(nextTurn.value.state.player.pendingEnergy).toBe(0)
  })

  it('records early practice without grading and grants bravery only once per battle', () => {
    const battle = battleWith(card(vocabulary.id))
    const state = dueState({ dueAt: NOW + DAY_MS })
    const first = resolveOvercharge({
      pending: preparedFor(battle, state),
      battle,
      state,
      response: 'keep',
      usedHint: false,
      now: NOW,
      logId: 'log-practice-1',
    })
    if (!first.ok || first.value.status !== 'resolved') {
      throw new Error('expected the first overcharge to resolve')
    }
    expect(first.value.log).toMatchObject({ eligible: false, graded: false })
    expect(first.value.srsState).toEqual(state)
    expect(
      first.value.events.filter((event) => event.type === 'bravery-rewarded'),
    ).toHaveLength(1)

    const nextTurn = reduceBattle(first.value.battle, { type: 'end-turn' })
    if (!nextTurn.ok) throw new Error(nextTurn.error.message)
    const secondBattle = nextTurn.value.state
    const second = resolveOvercharge({
      pending: preparedFor(secondBattle, state),
      battle: secondBattle,
      state,
      response: 'keep',
      usedHint: false,
      now: NOW + 1_000,
      logId: 'log-practice-2',
    })
    if (!second.ok || second.value.status !== 'resolved') {
      throw new Error('expected the second overcharge to resolve')
    }

    expect(
      second.value.events.filter((event) => event.type === 'bravery-rewarded'),
    ).toHaveLength(0)
  })

  it('keeps relic effects inside combat without changing recall facts', () => {
    const battle = battleWith(card(vocabulary.id), [
      'root-compass',
      'mistake-notebook',
    ])
    const state = dueState()
    const result = resolveOvercharge({
      pending: preparedFor(battle, state),
      battle,
      state,
      response: 'leave',
      usedHint: false,
      now: NOW,
      logId: 'log-relics',
    })
    if (!result.ok || result.value.status !== 'resolved') {
      throw new Error('expected a resolved overcharge')
    }

    expect(result.value.battle.player.block).toBe(4)
    expect(result.value.battle.triggeredRelicIds).toEqual([
      'mistake-notebook',
      'root-compass',
    ])
    expect(result.value.log).toMatchObject({
      correct: true,
      eligible: true,
      graded: true,
      grade: 'good',
    })
  })
})
