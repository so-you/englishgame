import type {
  BattleErrorCode,
  BattleEvent,
  BattleState,
} from '../battle/model'
import { reduceBattle } from '../battle/reduce-battle'
import {
  evaluateAnswer,
  type AnswerEvaluation,
} from '../learning/evaluate-answer'
import { MVP_BALANCE } from '../config/mvp-balance'
import { err, ok, type Result } from '../shared/result'
import type { RecallLog, SrsState } from '../srs/model'
import { recordRecall } from '../srs/record-recall'
import type { PendingOvercharge } from './prepare-overcharge'

export type ResolveOverchargeErrorCode =
  | BattleErrorCode
  | 'stale-overcharge'
  | 'state-mismatch'

export interface ResolveOverchargeError {
  readonly code: ResolveOverchargeErrorCode
  readonly message: string
}

export interface ResolveOverchargeInput {
  readonly pending: PendingOvercharge
  readonly battle: BattleState
  readonly state: SrsState
  readonly response: string | readonly string[]
  readonly usedHint: boolean
  readonly confirmedNearMatch?: boolean
  readonly responseMs?: number
  readonly now: number
  readonly logId: string
}

export type ResolveOverchargeValue =
  | {
      readonly status: 'needs-confirmation'
      readonly evaluation: AnswerEvaluation
      readonly pending: PendingOvercharge
    }
  | {
      readonly status: 'resolved'
      readonly evaluation: 'correct' | 'incorrect'
      readonly battle: BattleState
      readonly srsState: SrsState
      readonly log: RecallLog
      readonly events: readonly BattleEvent[]
    }

/** Submits facts to battle and SRS through their public reducers; it never assigns a grade itself. */
export function resolveOvercharge(
  input: ResolveOverchargeInput,
): Result<ResolveOverchargeValue, ResolveOverchargeError> {
  if (input.pending.battleId !== input.battle.id) {
    return err({
      code: 'stale-overcharge',
      message: '这道题不属于当前战斗。',
    })
  }
  if (input.pending.unitId !== input.state.unitId) {
    return err({
      code: 'state-mismatch',
      message: '学习进度与锁定题目不匹配。',
    })
  }

  const answer = evaluateAnswer(input.pending.exercise, input.response)
  if (answer.status === 'needs-confirmation' && !input.confirmedNearMatch) {
    return ok({
      status: 'needs-confirmation',
      evaluation: answer,
      pending: input.pending,
    })
  }
  const correct =
    answer.status === 'correct' ||
    (answer.status === 'needs-confirmation' && input.confirmedNearMatch === true)
  const isDue =
    input.state.mastery > 0 &&
    input.state.dueAt !== undefined &&
    input.state.dueAt <= input.now
  const braveryEligible = isDue || input.state.mastery <= 2
  const baseBonus =
    MVP_BALANCE.overchargeBonusByMastery[input.state.mastery] ?? 0
  const correctBonus =
    baseBonus +
    (isDue && input.state.mastery <= 2 ? MVP_BALANCE.dueChallengeBonus : 0)
  const bonusStrength = !correct
    ? 0
    : input.usedHint
      ? Math.floor(correctBonus * MVP_BALANCE.hintedBonusMultiplier)
      : correctBonus

  const battleResult = reduceBattle(input.battle, {
    type: 'play-overcharged-card',
    cardId: input.pending.cardId,
    outcome: !correct
      ? 'incorrect'
      : input.usedHint
        ? 'hinted-correct'
        : 'correct',
    bonusStrength,
    bravery: braveryEligible
      ? { unitId: input.state.unitId, isDue }
      : undefined,
  })
  if (!battleResult.ok) return err(battleResult.error)

  const recall = recordRecall({
    state: input.state,
    exercise: input.pending.exercise,
    correct,
    usedHint: input.usedHint,
    responseMs: input.responseMs,
    now: input.now,
    logId: input.logId,
    sessionId: input.battle.sessionId,
    encounterId: input.battle.id,
  })

  return ok({
    status: 'resolved',
    evaluation: correct ? 'correct' : 'incorrect',
    battle: battleResult.value.state,
    srsState: recall.state,
    log: recall.log,
    events: battleResult.value.events,
  })
}
