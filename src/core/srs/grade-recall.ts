import { MVP_BALANCE } from '../config/mvp-balance'
import { DAY_MS, type Mastery, type RecallGrade, type SrsState } from './model'

export function gradeFromFacts(correct: boolean, usedHint: boolean): RecallGrade {
  if (!correct) return 'again'
  return usedHint ? 'hard' : 'good'
}
function intervalFor(mastery: Mastery): number {
  const interval = MVP_BALANCE.intervalDaysByMastery[mastery]
  if (interval === undefined) {
    throw new Error(`Missing interval configuration for mastery L${mastery}.`)
  }
  return interval
}

export function applyRecallGrade(
  state: SrsState,
  grade: RecallGrade,
  now: number,
): SrsState {
  const scheduledDueAt = state.dueAt
  if (scheduledDueAt === undefined) {
    return state
  }

  if (grade === 'good') {
    const mastery = Math.min(5, state.mastery + 1) as Mastery
    const intervalDays = intervalFor(mastery)
    return {
      ...state,
      mastery,
      intervalDays,
      dueAt: now + intervalDays * DAY_MS,
      lastGradedDueAt: scheduledDueAt,
      lastReviewedAt: now,
      consecutiveCorrect: state.consecutiveCorrect + 1,
    }
  }

  if (grade === 'hard') {
    const intervalDays = intervalFor(state.mastery)
    return {
      ...state,
      intervalDays,
      dueAt: now + intervalDays * DAY_MS,
      lastGradedDueAt: scheduledDueAt,
      lastReviewedAt: now,
    }
  }

  const mastery = Math.max(1, state.mastery - 1) as Mastery
  const intervalDays = intervalFor(1)
  return {
    ...state,
    mastery,
    intervalDays,
    dueAt: now + intervalDays * DAY_MS,
    lastGradedDueAt: scheduledDueAt,
    lastReviewedAt: now,
    consecutiveCorrect: 0,
    lapses: state.lapses + 1,
  }
}
