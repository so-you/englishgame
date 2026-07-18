import type { Exercise } from '../learning/model'
import { isEligibleForGrading } from './eligibility'
import { applyRecallGrade, gradeFromFacts } from './grade-recall'
import type { RecallLog, SrsState } from './model'

export interface RecordRecallInput {
  readonly state: SrsState
  readonly exercise: Exercise
  readonly correct: boolean
  readonly usedHint: boolean
  readonly responseMs?: number
  readonly now: number
  readonly logId: string
  readonly sessionId: string
  readonly encounterId?: string
}

export interface RecordRecallResult {
  readonly state: SrsState
  readonly log: RecallLog
}

export function recordRecall(input: RecordRecallInput): RecordRecallResult {
  const eligible = isEligibleForGrading(input.state, input.exercise, input.now)
  const grade = eligible ? gradeFromFacts(input.correct, input.usedHint) : undefined
  const state = grade
    ? applyRecallGrade(input.state, grade, input.now)
    : input.state

  return {
    state,
    log: {
      id: input.logId,
      unitId: input.state.unitId,
      exerciseId: input.exercise.id,
      sessionId: input.sessionId,
      encounterId: input.encounterId,
      scheduledDueAt: input.state.dueAt,
      kind: input.exercise.kind,
      correct: input.correct,
      usedHint: input.usedHint,
      responseMs: input.responseMs,
      eligible,
      graded: eligible,
      grade,
      createdAt: input.now,
    },
  }
}
