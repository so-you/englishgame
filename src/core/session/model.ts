import type { BattleState, CombatCardInstance } from '../battle/model'
import type { ContentPack } from '../learning/model'
import type { RecallLog, SrsState } from '../srs/model'
import type { LearningSetSnapshot } from '../srs/schedule-learning-set'

export type SessionPhase =
  | 'setup'
  | 'teaching'
  | 'battle-1'
  | 'relic-reward'
  | 'battle-2'
  | 'heal-reward'
  | 'boss'
  | 'settlement'
  | 'defeat'

export interface SessionState {
  readonly id: string
  readonly seed: number
  readonly createdAt: number
  readonly phase: SessionPhase
  readonly contentPack: ContentPack
  readonly learningSet: LearningSetSnapshot
  readonly cards: readonly CombatCardInstance[]
  readonly srsStates: Readonly<Record<string, SrsState>>
  readonly teachingIndex: number
  readonly logs: readonly RecallLog[]
  readonly recentExerciseIds: readonly string[]
  readonly relicIds: readonly string[]
  readonly currentBattle?: BattleState
}

export type SessionErrorCode =
  | 'invalid-content-pack'
  | 'invalid-phase'
  | 'missing-learning-state'
  | 'battle-error'
  | 'invalid-reward'
  | 'confirmation-required'

export interface SessionError {
  readonly code: SessionErrorCode
  readonly message: string
}
