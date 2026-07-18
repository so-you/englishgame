import { describe, expect, it } from 'vitest'

import type { Result } from '../shared/result'
import { createBattle } from './create-battle'
import type {
  BattleError,
  BattleState,
  BattleTransition,
  CombatCardInstance,
} from './model'
import { reduceBattle } from './reduce-battle'
import { selectCurrentIntent } from './battle-selectors'
import { MVP_STARTER_DECK_TEMPLATE_IDS } from './mvp-cards'

function card(
  id: string,
  templateId: string,
  learningUnitId?: string,
): CombatCardInstance {
  return {
    id,
    templateId,
    learningUnitId,
    sessionId: 'session-1',
    upgraded: false,
  }
}

function valueOf<T>(result: Result<T, BattleError>): T {
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

function stateOf(result: BattleTransition): BattleState {
  return valueOf(result).state
}

describe('battle reducer', () => {
  it('rejects a card when there is not enough energy without mutating battle state', () => {
    const initial = valueOf(
      createBattle({
        id: 'battle-1',
        sessionId: 'session-1',
        enemyId: 'ink-blob',
        cards: [card('heavy-1', 'heavy-strike'), card('heavy-2', 'heavy-strike')],
        relicIds: [],
        seed: 7,
      }),
    )
    const afterFirst = stateOf(
      reduceBattle(initial, { type: 'play-card', cardId: initial.hand[0]! }),
    )
    const beforeRejectedPlay = structuredClone(afterFirst)

    const rejected = reduceBattle(afterFirst, {
      type: 'play-card',
      cardId: afterFirst.hand[0]!,
    })

    expect(rejected).toEqual({
      ok: false,
      error: {
        code: 'insufficient-energy',
        message: '需要 2 点能量，但当前只有 1 点。',
      },
    })
    expect(afterFirst).toEqual(beforeRejectedPlay)
  })

  it('keeps base card damage independent of a bound unit mastery', () => {
    const createBoundBattle = (learningUnitId: string) =>
      valueOf(
        createBattle({
          id: `battle-${learningUnitId}`,
          sessionId: 'session-1',
          enemyId: 'ink-blob',
          cards: [card(`card-${learningUnitId}`, 'strike', learningUnitId)],
          relicIds: [],
          seed: 11,
        }),
      )
    const lowMastery = createBoundBattle('unit-at-l1')
    const highMastery = createBoundBattle('unit-at-l5')

    const lowResult = stateOf(
      reduceBattle(lowMastery, {
        type: 'play-card',
        cardId: lowMastery.hand[0]!,
      }),
    )
    const highResult = stateOf(
      reduceBattle(highMastery, {
        type: 'play-card',
        cardId: highMastery.hand[0]!,
      }),
    )

    expect(lowResult.enemy.hp).toBe(22)
    expect(highResult.enemy.hp).toBe(lowResult.enemy.hp)
  })

  it('resolves block, weakness, and multi-hit damage in combat order', () => {
    const guarded = valueOf(
      createBattle({
        id: 'guarded-battle',
        sessionId: 'session-1',
        enemyId: 'ink-blob',
        cards: [card('fortify-1', 'fortify')],
        relicIds: [],
        seed: 3,
      }),
    )
    const afterFortify = stateOf(
      reduceBattle(guarded, { type: 'play-card', cardId: guarded.hand[0]! }),
    )
    const afterEnemyStrike = stateOf(
      reduceBattle(afterFortify, { type: 'end-turn' }),
    )

    expect(afterEnemyStrike.player.hp).toBe(50)
    expect(afterEnemyStrike.player.block).toBe(0)
    expect(selectCurrentIntent(afterEnemyStrike)?.id).toBe(
      'ink-blob-guarded-strike',
    )

    const weakenedEnemy = valueOf(
      createBattle({
        id: 'weak-battle',
        sessionId: 'session-1',
        enemyId: 'echo-bat',
        cards: [card('disrupt-1', 'disrupt')],
        relicIds: [],
        seed: 3,
      }),
    )
    const afterDisrupt = stateOf(
      reduceBattle(weakenedEnemy, {
        type: 'play-card',
        cardId: weakenedEnemy.hand[0]!,
      }),
    )
    const afterWeakCombo = stateOf(
      reduceBattle(afterDisrupt, { type: 'end-turn' }),
    )

    expect(afterWeakCombo.player.hp).toBe(46)
    expect(afterWeakCombo.enemy.weakTurns).toBe(0)
  })

  it('discards a played draw card only after its effects resolve', () => {
    const initial = valueOf(
      createBattle({
        id: 'draw-battle',
        sessionId: 'session-1',
        enemyId: 'ink-blob',
        cards: [card('insight-1', 'insight'), card('strike-1', 'strike')],
        relicIds: [],
        seed: 5,
      }),
    )
    const insightId = initial.hand.find((id) => id === 'insight-1')!

    const next = stateOf(
      reduceBattle(initial, { type: 'play-card', cardId: insightId }),
    )

    expect(next.hand).toEqual(['strike-1'])
    expect(next.discardPile).toEqual(['insight-1'])
  })

  it('replays the same state from the same seed and action sequence', () => {
    const cards = MVP_STARTER_DECK_TEMPLATE_IDS.map((templateId, index) =>
      card(`card-${index + 1}`, templateId),
    )
    const create = () =>
      valueOf(
        createBattle({
          id: 'replay-battle',
          sessionId: 'session-1',
          enemyId: 'oblivion-guardian',
          cards,
          relicIds: ['fluency-charm'],
          seed: 20260718,
        }),
      )
    const replay = (initial: BattleState) => {
      let state = initial
      for (let turn = 0; turn < 3; turn += 1) {
        state = stateOf(reduceBattle(state, { type: 'end-turn' }))
      }
      return state
    }

    expect(replay(create())).toEqual(replay(create()))
  })

  it('rejects further actions after either combatant dies', () => {
    const doomed = valueOf(
      createBattle({
        id: 'lost-battle',
        sessionId: 'session-1',
        enemyId: 'ink-blob',
        cards: [card('strike-1', 'strike')],
        relicIds: [],
        seed: 1,
        playerHp: 1,
      }),
    )
    const lost = stateOf(reduceBattle(doomed, { type: 'end-turn' }))

    expect(lost.status).toBe('lost')
    expect(reduceBattle(lost, { type: 'end-turn' })).toMatchObject({
      ok: false,
      error: { code: 'battle-finished' },
    })

    const fiveStrikes = Array.from({ length: 5 }, (_, index) =>
      card(`strike-${index + 1}`, 'strike'),
    )
    let winning = valueOf(
      createBattle({
        id: 'won-battle',
        sessionId: 'session-1',
        enemyId: 'ink-blob',
        cards: fiveStrikes,
        relicIds: [],
        seed: 1,
      }),
    )
    for (const cardId of winning.hand.slice(0, 3)) {
      winning = stateOf(reduceBattle(winning, { type: 'play-card', cardId }))
    }
    winning = stateOf(reduceBattle(winning, { type: 'end-turn' }))
    for (const cardId of winning.hand.slice(0, 2)) {
      winning = stateOf(reduceBattle(winning, { type: 'play-card', cardId }))
    }

    expect(winning.status).toBe('won')
    expect(reduceBattle(winning, { type: 'end-turn' })).toMatchObject({
      ok: false,
      error: { code: 'battle-finished' },
    })
  })
})
