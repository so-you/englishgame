import {
  selectCanPlayCard,
  selectCard,
} from '../battle/battle-selectors'
import { canOverloadCard, type BattleState } from '../battle/model'
import type { ContentPack, Exercise } from '../learning/model'
import { selectExercise } from '../learning/select-exercise'
import { err, ok, type Result } from '../shared/result'
import type { SrsState } from '../srs/model'

export type PrepareOverchargeErrorCode =
  | 'card-not-playable'
  | 'neutral-card'
  | 'no-focus'
  | 'missing-srs-state'
  | 'exercise-unavailable'

export interface PrepareOverchargeError {
  readonly code: PrepareOverchargeErrorCode
  readonly message: string
}

export interface PendingOvercharge {
  readonly battleId: string
  readonly cardId: string
  readonly unitId: string
  readonly exercise: Exercise
  readonly startedAt: number
}

export interface PrepareOverchargeInput {
  readonly battle: BattleState
  readonly cardId: string
  readonly pack: ContentPack
  readonly states: ReadonlyMap<string, SrsState>
  readonly recentExerciseIds: readonly string[]
  readonly listeningAvailable: boolean
  readonly startedAt: number
}

/** Locks one exercise so answer submission cannot silently redraw the prompt. */
export function prepareOvercharge(
  input: PrepareOverchargeInput,
): Result<PendingOvercharge, PrepareOverchargeError> {
  const card = selectCard(input.battle, input.cardId)
  if (!card || !input.battle.hand.includes(input.cardId)) {
    return err({
      code: 'card-not-playable',
      message: '这张牌不在当前手牌中。',
    })
  }
  if (!canOverloadCard(card)) {
    return err({ code: 'neutral-card', message: '中性卡没有学习铭文，不能过载。' })
  }
  if (input.battle.player.focus <= 0) {
    return err({ code: 'no-focus', message: '本场战斗的专注已经用完。' })
  }
  if (!selectCanPlayCard(input.battle, input.cardId)) {
    return err({
      code: 'card-not-playable',
      message: '当前能量不足，或战斗已经结束。',
    })
  }

  const state = input.states.get(card.learningUnitId!)
  if (!state) {
    return err({
      code: 'missing-srs-state',
      message: `找不到学习项目 ${card.learningUnitId} 的进度。`,
    })
  }
  const exercise = selectExercise({
    pack: input.pack,
    unitId: card.learningUnitId!,
    mastery: state.mastery,
    recentExerciseIds: input.recentExerciseIds,
    listeningAvailable: input.listeningAvailable,
  })
  if (!exercise) {
    return err({
      code: 'exercise-unavailable',
      message: '当前学习项目没有适合其掌握度的练习。',
    })
  }

  return ok({
    battleId: input.battle.id,
    cardId: input.cardId,
    unitId: card.learningUnitId!,
    exercise,
    startedAt: input.startedAt,
  })
}
