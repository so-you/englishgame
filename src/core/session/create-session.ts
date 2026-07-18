import { createBattle } from '../battle/create-battle'
import type { BattleState, CombatCardInstance } from '../battle/model'
import { MVP_STARTER_DECK_TEMPLATE_IDS } from '../battle/mvp-cards'
import { validateContentPack } from '../content/validate-pack'
import type { ContentPack } from '../learning/model'
import { err, ok, type Result } from '../shared/result'
import { initialSrsState, type SrsState } from '../srs/model'
import { scheduleLearningSet } from '../srs/schedule-learning-set'
import type { SessionError, SessionPhase, SessionState } from './model'

export interface CreateSessionInput {
  readonly id: string
  readonly seed: number
  readonly pack: ContentPack
  readonly states: ReadonlyMap<string, SrsState>
  readonly now: number
  readonly newUnitQuota: number
}

const ENEMY_BY_PHASE: Readonly<
  Partial<Record<SessionPhase, 'ink-blob' | 'echo-bat' | 'oblivion-guardian'>>
> = {
  'battle-1': 'ink-blob',
  'battle-2': 'echo-bat',
  boss: 'oblivion-guardian',
}

const ENCOUNTER_NUMBER: Readonly<Partial<Record<SessionPhase, number>>> = {
  'battle-1': 1,
  'battle-2': 2,
  boss: 3,
}

export function createBattleForPhase(
  session: SessionState,
  phase: 'battle-1' | 'battle-2' | 'boss',
  playerHp?: number,
): Result<BattleState, SessionError> {
  const encounter = ENCOUNTER_NUMBER[phase]!
  const battle = createBattle({
    id: `${session.id}:${phase}`,
    sessionId: session.id,
    enemyId: ENEMY_BY_PHASE[phase]!,
    cards: session.cards,
    relicIds: session.relicIds,
    seed: (session.seed + Math.imul(encounter, 0x9e3779b9)) >>> 0,
    playerHp,
  })
  return battle.ok
    ? ok(battle.value)
    : err({ code: 'battle-error', message: battle.error.message })
}

export function createSession(
  input: CreateSessionInput,
): Result<SessionState, SessionError> {
  const violations = validateContentPack(input.pack)
  if (violations.length > 0) {
    return err({
      code: 'invalid-content-pack',
      message: `内容包校验失败：${violations[0]!.message}`,
    })
  }

  const learningSet = scheduleLearningSet({
    units: input.pack.units,
    states: input.states,
    now: input.now,
    newUnitQuota: input.newUnitQuota,
  })
  const srsStates: Record<string, SrsState> = Object.fromEntries(input.states)
  for (const unitId of learningSet.unitIds) {
    srsStates[unitId] ??= initialSrsState(unitId)
  }
  const cards: readonly CombatCardInstance[] =
    MVP_STARTER_DECK_TEMPLATE_IDS.map((templateId, index) => ({
      id: `${input.id}:card:${index + 1}`,
      templateId,
      learningUnitId: learningSet.unitIds[index],
      sessionId: input.id,
      upgraded: false,
    }))
  const hasTeaching = learningSet.newUnitIds.length > 0
  let session: SessionState = {
    id: input.id,
    seed: input.seed >>> 0,
    createdAt: input.now,
    phase: hasTeaching ? 'teaching' : 'battle-1',
    contentPack: input.pack,
    learningSet,
    cards,
    srsStates,
    teachingIndex: 0,
    logs: [],
    recentExerciseIds: [],
    relicIds: [],
  }

  if (!hasTeaching) {
    const battle = createBattleForPhase(session, 'battle-1')
    if (!battle.ok) return battle
    session = { ...session, currentBattle: battle.value }
  }

  return ok(session)
}
