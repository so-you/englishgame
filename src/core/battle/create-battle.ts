import { MVP_BALANCE } from '../config/mvp-balance'
import { err, ok, type Result } from '../shared/result'
import type { BattleError, BattleState, CombatCardInstance } from './model'
import { MVP_CARD_TEMPLATES } from './mvp-cards'
import { MVP_ENEMIES } from './mvp-enemies'
import { MVP_RELICS } from './mvp-relics'
import { createSeededRng, shuffleWithState } from './rng'

export interface CreateBattleInput {
  readonly id: string
  readonly sessionId: string
  readonly enemyId: string
  readonly cards: readonly CombatCardInstance[]
  readonly relicIds: readonly string[]
  readonly seed: number
  readonly playerHp?: number
  readonly playerMaxHp?: number
}

export function createBattle(
  input: CreateBattleInput,
): Result<BattleState, BattleError> {
  const enemy = MVP_ENEMIES.find((candidate) => candidate.id === input.enemyId)
  const templateIds = new Set(MVP_CARD_TEMPLATES.map((template) => template.id))
  const relicIds = new Set<string>(MVP_RELICS.map((relic) => relic.id))
  const playerMaxHp = input.playerMaxHp ?? MVP_BALANCE.playerStartingHp
  const playerHp = input.playerHp ?? playerMaxHp

  if (!enemy) {
    return err({
      code: 'invalid-battle-setup',
      message: `未知敌人：${input.enemyId}。`,
    })
  }
  if (input.cards.some((card) => !templateIds.has(card.templateId))) {
    return err({
      code: 'invalid-battle-setup',
      message: '牌组引用了未知卡牌模板。',
    })
  }
  if (new Set(input.cards.map((card) => card.id)).size !== input.cards.length) {
    return err({
      code: 'invalid-battle-setup',
      message: '牌组中的卡牌实例 ID 必须唯一。',
    })
  }
  if (input.relicIds.some((id) => !relicIds.has(id))) {
    return err({
      code: 'invalid-battle-setup',
      message: '战斗引用了未知遗物。',
    })
  }
  if (playerMaxHp <= 0 || playerHp <= 0 || playerHp > playerMaxHp) {
    return err({
      code: 'invalid-battle-setup',
      message: '玩家生命值必须大于 0 且不能超过生命上限。',
    })
  }

  const shuffled = shuffleWithState(
    input.cards.map((card) => card.id),
    createSeededRng(input.seed),
  )
  const hand = shuffled.items.slice(0, MVP_BALANCE.cardsDrawnPerTurn)
  const drawPile = shuffled.items.slice(MVP_BALANCE.cardsDrawnPerTurn)
  const hasFluencyCharm = input.relicIds.includes('fluency-charm')

  return ok({
    id: input.id,
    sessionId: input.sessionId,
    status: 'active',
    turn: 1,
    player: {
      hp: playerHp,
      maxHp: playerMaxHp,
      block: 0,
      weakTurns: 0,
      energy: MVP_BALANCE.energyPerTurn,
      focus: MVP_BALANCE.focusPerBattle,
      fluency: hasFluencyCharm ? 1 : 0,
      pendingEnergy: 0,
    },
    enemy: {
      definitionId: enemy.id,
      hp: enemy.maxHp,
      maxHp: enemy.maxHp,
      block: 0,
      weakTurns: 0,
      intentIndex: 0,
    },
    cards: [...input.cards],
    drawPile,
    hand,
    discardPile: [],
    relicIds: [...input.relicIds],
    triggeredRelicIds: hasFluencyCharm ? ['fluency-charm'] : [],
    braveryRewardedUnitIds: [],
    rng: shuffled.state,
  })
}
