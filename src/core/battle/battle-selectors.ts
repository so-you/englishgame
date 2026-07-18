import type {
  BattleState,
  CardTemplate,
  CombatCardInstance,
  Intent,
} from './model'
import { MVP_CARD_TEMPLATES } from './mvp-cards'
import { getEnemyIntent, MVP_ENEMIES } from './mvp-enemies'

export function selectCard(
  state: BattleState,
  cardId: string,
): CombatCardInstance | undefined {
  return state.cards.find((card) => card.id === cardId)
}

export function selectCardTemplate(
  state: BattleState,
  cardId: string,
): CardTemplate | undefined {
  const card = selectCard(state, cardId)
  return card
    ? MVP_CARD_TEMPLATES.find((template) => template.id === card.templateId)
    : undefined
}

export function selectCanPlayCard(state: BattleState, cardId: string): boolean {
  const template = selectCardTemplate(state, cardId)
  return (
    state.status === 'active' &&
    state.hand.includes(cardId) &&
    template !== undefined &&
    state.player.energy >= template.cost
  )
}

export function selectCurrentIntent(state: BattleState): Intent | undefined {
  const enemy = MVP_ENEMIES.find(
    (candidate) => candidate.id === state.enemy.definitionId,
  )
  return enemy ? getEnemyIntent(enemy, state.enemy.intentIndex) : undefined
}
