import type { SeededRngState } from './rng'

export type CardCost = 0 | 1 | 2
export type CardRarity = 'starter' | 'common' | 'uncommon' | 'rare'

export type CombatEffect =
  | { readonly type: 'damage'; readonly amount: number; readonly hits: number }
  | { readonly type: 'block'; readonly amount: number }
  | { readonly type: 'draw'; readonly amount: number }
  | { readonly type: 'weak'; readonly turns: number }

export interface CardTemplate {
  readonly id: string
  readonly name: string
  readonly cost: CardCost
  readonly rarity: CardRarity
  readonly effects: readonly CombatEffect[]
  readonly tags: readonly string[]
}

export interface CombatCardInstance {
  readonly id: string
  readonly templateId: string
  readonly learningUnitId?: string
  readonly sessionId: string
  readonly upgraded: boolean
}

export interface Intent {
  readonly id: string
  readonly name: string
  readonly effects: readonly CombatEffect[]
}

export interface EnemyDefinition {
  readonly id: string
  readonly name: string
  readonly kind: 'normal' | 'boss'
  readonly maxHp: number
  readonly intentCycle: readonly Intent[]
}

export type RelicEffect =
  | { readonly type: 'draw-cards'; readonly amount: number }
  | { readonly type: 'bravery-block-bonus'; readonly amount: number }
  | { readonly type: 'starting-fluency'; readonly amount: number }

export interface RelicDefinition {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly trigger:
    | 'first-overload-correct'
    | 'first-due-attempt'
    | 'battle-start'
  readonly effect: RelicEffect
}

export interface CombatantState {
  readonly hp: number
  readonly maxHp: number
  readonly block: number
  readonly weakTurns: number
}

export interface BattleState {
  readonly id: string
  readonly sessionId: string
  readonly status: 'active' | 'won' | 'lost'
  readonly turn: number
  readonly player: CombatantState & {
    readonly energy: number
    readonly focus: number
    readonly fluency: number
    readonly pendingEnergy: number
  }
  readonly enemy: CombatantState & {
    readonly definitionId: string
    readonly intentIndex: number
  }
  readonly cards: readonly CombatCardInstance[]
  readonly drawPile: readonly string[]
  readonly hand: readonly string[]
  readonly discardPile: readonly string[]
  readonly relicIds: readonly string[]
  readonly triggeredRelicIds: readonly string[]
  readonly braveryRewardedUnitIds: readonly string[]
  readonly rng: SeededRngState
}

export type BattleAction =
  | { readonly type: 'play-card'; readonly cardId: string }
  | {
      readonly type: 'play-overcharged-card'
      readonly cardId: string
      readonly outcome: 'correct' | 'hinted-correct' | 'incorrect'
      readonly bonusStrength: number
      readonly bravery?: {
        readonly unitId: string
        readonly isDue: boolean
      }
    }
  | { readonly type: 'end-turn' }

export type BattleErrorCode =
  | 'battle-finished'
  | 'card-not-in-hand'
  | 'unknown-card-template'
  | 'insufficient-energy'
  | 'neutral-card'
  | 'no-focus'
  | 'invalid-battle-setup'

export interface BattleError {
  readonly code: BattleErrorCode
  readonly message: string
}

export type BattleEvent =
  | { readonly type: 'card-played'; readonly cardId: string }
  | { readonly type: 'damage-dealt'; readonly target: 'player' | 'enemy'; readonly amount: number }
  | { readonly type: 'block-gained'; readonly target: 'player' | 'enemy'; readonly amount: number }
  | { readonly type: 'cards-drawn'; readonly amount: number }
  | { readonly type: 'weak-applied'; readonly target: 'player' | 'enemy'; readonly turns: number }
  | { readonly type: 'turn-ended'; readonly turn: number }
  | { readonly type: 'focus-spent'; readonly remaining: number }
  | { readonly type: 'fluency-changed'; readonly value: number }
  | { readonly type: 'energy-scheduled'; readonly amount: number }
  | { readonly type: 'bravery-rewarded'; readonly unitId: string; readonly block: number }
  | { readonly type: 'relic-triggered'; readonly relicId: string }
  | { readonly type: 'battle-won' }
  | { readonly type: 'battle-lost' }

export interface BattleTransitionValue {
  readonly state: BattleState
  readonly events: readonly BattleEvent[]
}

export type BattleTransition =
  | { readonly ok: true; readonly value: BattleTransitionValue }
  | { readonly ok: false; readonly error: BattleError }

export function canOverloadCard(card: CombatCardInstance): boolean {
  return card.learningUnitId !== undefined
}
