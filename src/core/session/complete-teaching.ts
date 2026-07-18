import { err, ok, type Result } from '../shared/result'
import { initialSrsState } from '../srs/model'
import { completeTeaching } from '../srs/teaching'
import { createBattleForPhase } from './create-session'
import type { SessionError, SessionState } from './model'

export interface CompleteNextTeachingInput {
  readonly session: SessionState
  readonly now: number
  readonly logId: string
}

export function completeNextTeaching(
  input: CompleteNextTeachingInput,
): Result<SessionState, SessionError> {
  if (input.session.phase !== 'teaching') {
    return err({
      code: 'invalid-phase',
      message: '当前会话不在战前教学阶段。',
    })
  }
  const unitId =
    input.session.learningSet.newUnitIds[input.session.teachingIndex]
  if (!unitId) {
    return err({
      code: 'missing-learning-state',
      message: '没有可继续教学的新项目。',
    })
  }

  const teaching = completeTeaching({
    state: input.session.srsStates[unitId] ?? initialSrsState(unitId),
    now: input.now,
    logId: input.logId,
    sessionId: input.session.id,
  })
  const teachingIndex = input.session.teachingIndex + 1
  let next: SessionState = {
    ...input.session,
    teachingIndex,
    srsStates: {
      ...input.session.srsStates,
      [unitId]: teaching.state,
    },
    logs: [...input.session.logs, teaching.log],
  }

  if (teachingIndex === input.session.learningSet.newUnitIds.length) {
    const battle = createBattleForPhase(next, 'battle-1')
    if (!battle.ok) return battle
    next = { ...next, phase: 'battle-1', currentBattle: battle.value }
  }

  return ok(next)
}
