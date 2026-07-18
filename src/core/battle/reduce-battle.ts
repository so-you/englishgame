import { MVP_BALANCE } from '../config/mvp-balance'
import { err, ok } from '../shared/result'
import type {
  BattleAction,
  BattleEvent,
  BattleState,
  BattleTransition,
  CombatEffect,
} from './model'
import { MVP_CARD_TEMPLATES } from './mvp-cards'
import { getEnemyIntent, MVP_ENEMIES } from './mvp-enemies'
import { shuffleWithState } from './rng'

interface DamageResult {
  readonly hp: number
  readonly block: number
  readonly dealt: number
}

function dealDamage(hp: number, block: number, amount: number): DamageResult {
  const absorbed = Math.min(block, amount)
  const dealt = Math.min(hp, amount - absorbed)
  return {
    hp: hp - dealt,
    block: block - absorbed,
    dealt,
  }
}

function drawCards(state: BattleState, requested: number): BattleState {
  let drawPile = [...state.drawPile]
  let discardPile = [...state.discardPile]
  const hand = [...state.hand]
  let rng = state.rng
  let remaining = Math.min(requested, MVP_BALANCE.handLimit - hand.length)

  while (remaining > 0) {
    if (drawPile.length === 0) {
      if (discardPile.length === 0) break
      const shuffled = shuffleWithState(discardPile, rng)
      drawPile = [...shuffled.items]
      discardPile = []
      rng = shuffled.state
    }

    hand.push(drawPile.shift()!)
    remaining -= 1
  }

  return { ...state, drawPile, discardPile, hand, rng }
}

function applyPlayerEffect(
  state: BattleState,
  effect: CombatEffect,
  events: BattleEvent[],
): BattleState {
  if (effect.type === 'block') {
    events.push({ type: 'block-gained', target: 'player', amount: effect.amount })
    return {
      ...state,
      player: { ...state.player, block: state.player.block + effect.amount },
    }
  }
  if (effect.type === 'draw') {
    const before = state.hand.length
    const next = drawCards(state, effect.amount)
    events.push({ type: 'cards-drawn', amount: next.hand.length - before })
    return next
  }
  if (effect.type === 'weak') {
    events.push({ type: 'weak-applied', target: 'enemy', turns: effect.turns })
    return {
      ...state,
      enemy: { ...state.enemy, weakTurns: state.enemy.weakTurns + effect.turns },
    }
  }

  const hitDamage =
    state.player.weakTurns > 0
      ? Math.floor(effect.amount * 0.75)
      : effect.amount
  let enemy = state.enemy
  let totalDealt = 0
  for (let hit = 0; hit < effect.hits && enemy.hp > 0; hit += 1) {
    const damage = dealDamage(enemy.hp, enemy.block, hitDamage)
    enemy = { ...enemy, hp: damage.hp, block: damage.block }
    totalDealt += damage.dealt
  }
  events.push({ type: 'damage-dealt', target: 'enemy', amount: totalDealt })
  return { ...state, enemy }
}

function playCard(state: BattleState, cardId: string): BattleTransition {
  const handIndex = state.hand.indexOf(cardId)
  if (handIndex < 0) {
    return err({ code: 'card-not-in-hand', message: '这张牌不在当前手牌中。' })
  }

  const card = state.cards.find((candidate) => candidate.id === cardId)!
  const template = MVP_CARD_TEMPLATES.find(
    (candidate) => candidate.id === card.templateId,
  )
  if (!template) {
    return err({
      code: 'unknown-card-template',
      message: `未知卡牌模板：${card.templateId}。`,
    })
  }
  if (state.player.energy < template.cost) {
    return err({
      code: 'insufficient-energy',
      message: `需要 ${template.cost} 点能量，但当前只有 ${state.player.energy} 点。`,
    })
  }

  const events: BattleEvent[] = [{ type: 'card-played', cardId }]
  const hand = [...state.hand]
  hand.splice(handIndex, 1)
  let next: BattleState = {
    ...state,
    player: { ...state.player, energy: state.player.energy - template.cost },
    hand,
  }

  for (const effect of template.effects) {
    next = applyPlayerEffect(next, effect, events)
  }
  next = { ...next, discardPile: [...next.discardPile, cardId] }

  if (next.enemy.hp === 0) {
    next = { ...next, status: 'won' }
    events.push({ type: 'battle-won' })
  }

  return ok({ state: next, events })
}

function playOverchargedCard(
  state: BattleState,
  action: Extract<BattleAction, { type: 'play-overcharged-card' }>,
): BattleTransition {
  const card = state.cards.find((candidate) => candidate.id === action.cardId)
  if (!card?.learningUnitId) {
    return err({
      code: 'neutral-card',
      message: '中性卡没有学习铭文，不能过载。',
    })
  }
  if (state.player.focus <= 0) {
    return err({ code: 'no-focus', message: '本场战斗的专注已经用完。' })
  }

  const played = playCard(state, action.cardId)
  if (!played.ok) return played

  const events = [...played.value.events]
  let next: BattleState = {
    ...played.value.state,
    player: {
      ...played.value.state.player,
      focus: played.value.state.player.focus - 1,
    },
  }
  events.push({ type: 'focus-spent', remaining: next.player.focus })

  if (
    action.bravery &&
    !next.braveryRewardedUnitIds.includes(action.bravery.unitId)
  ) {
    const notebookTriggers =
      action.bravery.isDue &&
      next.relicIds.includes('mistake-notebook') &&
      !next.triggeredRelicIds.includes('mistake-notebook')
    const block = MVP_BALANCE.braveryBlock + (notebookTriggers ? 2 : 0)
    next = {
      ...next,
      player: { ...next.player, block: next.player.block + block },
      braveryRewardedUnitIds: [
        ...next.braveryRewardedUnitIds,
        action.bravery.unitId,
      ],
      triggeredRelicIds: notebookTriggers
        ? [...next.triggeredRelicIds, 'mistake-notebook']
        : next.triggeredRelicIds,
    }
    events.push({
      type: 'bravery-rewarded',
      unitId: action.bravery.unitId,
      block,
    })
    if (notebookTriggers) {
      events.push({ type: 'relic-triggered', relicId: 'mistake-notebook' })
    }
  }

  if (action.outcome !== 'incorrect' && action.bonusStrength > 0) {
    const template = MVP_CARD_TEMPLATES.find(
      (candidate) => candidate.id === card.templateId,
    )!
    const primaryEffect = template.effects[0]
    if (primaryEffect?.type === 'damage') {
      next = applyPlayerEffect(
        next,
        { type: 'damage', amount: action.bonusStrength, hits: 1 },
        events,
      )
    } else if (primaryEffect?.type === 'block') {
      next = applyPlayerEffect(
        next,
        { type: 'block', amount: action.bonusStrength },
        events,
      )
    } else if (primaryEffect?.type === 'draw') {
      next = applyPlayerEffect(next, { type: 'draw', amount: 1 }, events)
    } else if (primaryEffect?.type === 'weak') {
      next = applyPlayerEffect(next, { type: 'weak', turns: 1 }, events)
    }
  }

  let fluency = next.player.fluency
  let pendingEnergy = next.player.pendingEnergy
  if (action.outcome === 'incorrect') {
    fluency = Math.max(0, fluency - 1)
  } else {
    fluency += 1
    if (fluency >= MVP_BALANCE.fluencyThreshold) {
      fluency -= MVP_BALANCE.fluencyThreshold
      pendingEnergy += 1
      events.push({ type: 'energy-scheduled', amount: 1 })
    }
  }
  next = { ...next, player: { ...next.player, fluency, pendingEnergy } }
  events.push({ type: 'fluency-changed', value: fluency })

  const compassTriggers =
    action.outcome !== 'incorrect' &&
    next.relicIds.includes('root-compass') &&
    !next.triggeredRelicIds.includes('root-compass')
  if (compassTriggers) {
    next = drawCards(next, 1)
    next = {
      ...next,
      triggeredRelicIds: [...next.triggeredRelicIds, 'root-compass'],
    }
    events.push({ type: 'relic-triggered', relicId: 'root-compass' })
  }

  if (next.enemy.hp === 0 && next.status !== 'won') {
    next = { ...next, status: 'won' }
    events.push({ type: 'battle-won' })
  }

  return ok({ state: next, events })
}

function applyEnemyEffect(
  state: BattleState,
  effect: CombatEffect,
  events: BattleEvent[],
): BattleState {
  if (effect.type === 'block') {
    events.push({ type: 'block-gained', target: 'enemy', amount: effect.amount })
    return {
      ...state,
      enemy: { ...state.enemy, block: state.enemy.block + effect.amount },
    }
  }
  if (effect.type === 'weak') {
    events.push({ type: 'weak-applied', target: 'player', turns: effect.turns })
    return {
      ...state,
      player: { ...state.player, weakTurns: state.player.weakTurns + effect.turns },
    }
  }
  if (effect.type === 'draw') return state

  const hitDamage =
    state.enemy.weakTurns > 0
      ? Math.floor(effect.amount * 0.75)
      : effect.amount
  let player = state.player
  let totalDealt = 0
  for (let hit = 0; hit < effect.hits && player.hp > 0; hit += 1) {
    const damage = dealDamage(player.hp, player.block, hitDamage)
    player = { ...player, hp: damage.hp, block: damage.block }
    totalDealt += damage.dealt
  }
  events.push({ type: 'damage-dealt', target: 'player', amount: totalDealt })
  return { ...state, player }
}

function endTurn(state: BattleState): BattleTransition {
  const enemyDefinition = MVP_ENEMIES.find(
    (enemy) => enemy.id === state.enemy.definitionId,
  )
  if (!enemyDefinition) {
    return err({
      code: 'invalid-battle-setup',
      message: `未知敌人：${state.enemy.definitionId}。`,
    })
  }

  const events: BattleEvent[] = [{ type: 'turn-ended', turn: state.turn }]
  let next: BattleState = {
    ...state,
    hand: [],
    discardPile: [...state.discardPile, ...state.hand],
    player: {
      ...state.player,
      weakTurns: Math.max(0, state.player.weakTurns - 1),
    },
    enemy: { ...state.enemy, block: 0 },
  }
  const intent = getEnemyIntent(enemyDefinition, next.enemy.intentIndex)

  for (const effect of intent.effects) {
    next = applyEnemyEffect(next, effect, events)
  }

  next = {
    ...next,
    enemy: {
      ...next.enemy,
      weakTurns: Math.max(0, next.enemy.weakTurns - 1),
      intentIndex:
        (next.enemy.intentIndex + 1) % enemyDefinition.intentCycle.length,
    },
  }

  if (next.player.hp === 0) {
    events.push({ type: 'battle-lost' })
    return ok({ state: { ...next, status: 'lost' }, events })
  }

  next = {
    ...next,
    turn: next.turn + 1,
    player: {
      ...next.player,
      block: 0,
      energy: MVP_BALANCE.energyPerTurn + next.player.pendingEnergy,
      pendingEnergy: 0,
    },
  }
  const beforeDraw = next.hand.length
  next = drawCards(next, MVP_BALANCE.cardsDrawnPerTurn)
  events.push({ type: 'cards-drawn', amount: next.hand.length - beforeDraw })
  return ok({ state: next, events })
}

export function reduceBattle(
  state: BattleState,
  action: BattleAction,
): BattleTransition {
  if (state.status !== 'active') {
    return err({
      code: 'battle-finished',
      message: '战斗已经结束，不能继续执行动作。',
    })
  }

  if (action.type === 'play-card') return playCard(state, action.cardId)
  if (action.type === 'play-overcharged-card') {
    return playOverchargedCard(state, action)
  }
  return endTurn(state)
}
