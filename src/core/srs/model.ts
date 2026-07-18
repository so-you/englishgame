import type { ExerciseKind } from '../learning/model'

export type Mastery = 0 | 1 | 2 | 3 | 4 | 5

export type LearningStatus = 'new' | 'learning' | 'review' | 'maintenance'
export type RecallGrade = 'again' | 'hard' | 'good'

export const DAY_MS = 24 * 60 * 60 * 1000

export interface SrsState {
  readonly unitId: string
  readonly mastery: Mastery
  readonly dueAt?: number
  readonly intervalDays: number
  readonly introducedAt?: number
  readonly lastReviewedAt?: number
  readonly lastGradedDueAt?: number
  readonly consecutiveCorrect: number
  readonly lapses: number
}

export interface RecallLog {
  readonly id: string
  readonly unitId: string
  readonly exerciseId?: string
  readonly sessionId: string
  readonly encounterId?: string
  readonly scheduledDueAt?: number
  readonly kind: 'teaching' | ExerciseKind
  readonly correct?: boolean
  readonly usedHint: boolean
  readonly responseMs?: number
  readonly eligible: boolean
  readonly graded: boolean
  readonly grade?: RecallGrade
  readonly createdAt: number
}

export function initialSrsState(unitId: string): SrsState {
  return {
    unitId,
    mastery: 0,
    intervalDays: 0,
    consecutiveCorrect: 0,
    lapses: 0,
  }
}

export function statusOf(mastery: Mastery): LearningStatus {
  if (mastery === 0) return 'new'
  if (mastery <= 2) return 'learning'
  if (mastery <= 4) return 'review'
  return 'maintenance'
}
