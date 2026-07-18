import { MVP_BALANCE } from '../config/mvp-balance'
import { DAY_MS, type RecallLog, type SrsState } from './model'

export interface CompleteTeachingInput {
  readonly state: SrsState
  readonly now: number
  readonly logId: string
  readonly sessionId: string
}

export interface CompleteTeachingResult {
  readonly state: SrsState
  readonly log: RecallLog
}

export function completeTeaching(
  input: CompleteTeachingInput,
): CompleteTeachingResult {
  const intervalDays = MVP_BALANCE.intervalDaysByMastery[1] ?? 1

  return {
    state: {
      ...input.state,
      mastery: 1,
      intervalDays,
      introducedAt: input.now,
      dueAt: input.now + intervalDays * DAY_MS,
    },
    log: {
      id: input.logId,
      unitId: input.state.unitId,
      sessionId: input.sessionId,
      kind: 'teaching',
      usedHint: false,
      eligible: false,
      graded: false,
      createdAt: input.now,
    },
  }
}
