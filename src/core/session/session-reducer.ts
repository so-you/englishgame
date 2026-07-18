import type { BattleAction } from '../battle/model'
import { reduceBattle } from '../battle/reduce-battle'
import { MVP_BALANCE } from '../config/mvp-balance'
import { MVP_RELICS } from '../battle/mvp-relics'
import { err, ok, type Result } from '../shared/result'
import type { PendingOvercharge } from './prepare-overcharge'
import { createBattleForPhase } from './create-session'
import type { SessionError, SessionState } from './model'
import { resolveOvercharge } from './resolve-overcharge'

export type SessionAction =
  | { readonly type: 'battle-action'; readonly action: BattleAction }
  | { readonly type: 'choose-relic'; readonly relicId: string }
  | { readonly type: 'claim-heal' }
  | {
      readonly type: 'resolve-overcharge'
      readonly pending: PendingOvercharge
      readonly response: string | readonly string[]
      readonly usedHint: boolean
      readonly confirmedNearMatch?: boolean
      readonly responseMs?: number
      readonly now: number
      readonly logId: string
    }

function isBattlePhase(session: SessionState): boolean {
  return (
    session.phase === 'battle-1' ||
    session.phase === 'battle-2' ||
    session.phase === 'boss'
  )
}

function advanceAfterBattle(session: SessionState): SessionState {
  const status = session.currentBattle?.status
  if (status === 'lost') return { ...session, phase: 'defeat' }
  if (status !== 'won') return session
  if (session.phase === 'battle-1') {
    return { ...session, phase: 'relic-reward' }
  }
  if (session.phase === 'battle-2') {
    return { ...session, phase: 'heal-reward' }
  }
  return { ...session, phase: 'settlement' }
}

function reduceBattleAction(
  session: SessionState,
  action: BattleAction,
): Result<SessionState, SessionError> {
  if (!isBattlePhase(session) || !session.currentBattle) {
    return err({
      code: 'invalid-phase',
      message: '当前会话没有可操作的战斗。',
    })
  }
  const transition = reduceBattle(session.currentBattle, action)
  if (!transition.ok) {
    return err({ code: 'battle-error', message: transition.error.message })
  }
  return ok(
    advanceAfterBattle({
      ...session,
      currentBattle: transition.value.state,
    }),
  )
}

function chooseRelic(
  session: SessionState,
  relicId: string,
): Result<SessionState, SessionError> {
  if (session.phase !== 'relic-reward' || !session.currentBattle) {
    return err({ code: 'invalid-phase', message: '当前不能选择遗物。' })
  }
  if (
    !MVP_RELICS.some((relic) => relic.id === relicId) ||
    session.relicIds.includes(relicId)
  ) {
    return err({ code: 'invalid-reward', message: '该遗物不可选择。' })
  }
  const withRelic: SessionState = {
    ...session,
    phase: 'battle-2',
    relicIds: [...session.relicIds, relicId],
  }
  const battle = createBattleForPhase(
    withRelic,
    'battle-2',
    session.currentBattle.player.hp,
  )
  return battle.ok
    ? ok({ ...withRelic, currentBattle: battle.value })
    : battle
}

function claimHeal(session: SessionState): Result<SessionState, SessionError> {
  if (session.phase !== 'heal-reward' || !session.currentBattle) {
    return err({ code: 'invalid-phase', message: '当前不能领取回血奖励。' })
  }
  const healedHp = Math.min(
    session.currentBattle.player.maxHp,
    session.currentBattle.player.hp + MVP_BALANCE.healReward,
  )
  const bossSession: SessionState = { ...session, phase: 'boss' }
  const battle = createBattleForPhase(bossSession, 'boss', healedHp)
  return battle.ok
    ? ok({ ...bossSession, currentBattle: battle.value })
    : battle
}

function reduceOverchargeAction(
  session: SessionState,
  action: Extract<SessionAction, { type: 'resolve-overcharge' }>,
): Result<SessionState, SessionError> {
  if (!isBattlePhase(session) || !session.currentBattle) {
    return err({
      code: 'invalid-phase',
      message: '当前会话没有可提交的过载题目。',
    })
  }
  const state = session.srsStates[action.pending.unitId]
  if (!state) {
    return err({
      code: 'missing-learning-state',
      message: `找不到学习项目 ${action.pending.unitId} 的进度。`,
    })
  }
  const resolved = resolveOvercharge({
    pending: action.pending,
    battle: session.currentBattle,
    state,
    response: action.response,
    usedHint: action.usedHint,
    confirmedNearMatch: action.confirmedNearMatch,
    responseMs: action.responseMs,
    now: action.now,
    logId: action.logId,
  })
  if (!resolved.ok) {
    return err({ code: 'battle-error', message: resolved.error.message })
  }
  if (resolved.value.status === 'needs-confirmation') {
    return err({
      code: 'confirmation-required',
      message: '该答案可能只有一个字符的拼写差异，需要用户确认。',
    })
  }

  return ok(
    advanceAfterBattle({
      ...session,
      currentBattle: resolved.value.battle,
      srsStates: {
        ...session.srsStates,
        [resolved.value.srsState.unitId]: resolved.value.srsState,
      },
      logs: [...session.logs, resolved.value.log],
      recentExerciseIds: [
        ...session.recentExerciseIds,
        resolved.value.log.exerciseId!,
      ],
    }),
  )
}

export function reduceSession(
  session: SessionState,
  action: SessionAction,
): Result<SessionState, SessionError> {
  if (action.type === 'battle-action') {
    return reduceBattleAction(session, action.action)
  }
  if (action.type === 'choose-relic') {
    return chooseRelic(session, action.relicId)
  }
  if (action.type === 'claim-heal') return claimHeal(session)
  return reduceOverchargeAction(session, action)
}
