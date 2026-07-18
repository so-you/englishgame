import { describe, expect, it } from 'vitest'

import type { ContentPack, Exercise, VocabularyUnit } from '../learning/model'
import { selectCardTemplate } from '../battle/battle-selectors'
import { completeNextTeaching } from './complete-teaching'
import { createSession } from './create-session'
import type { SessionState } from './model'
import { reduceSession } from './session-reducer'
import { buildSessionSettlement } from './settlement'
import { prepareOvercharge } from './prepare-overcharge'

const NOW = 1_800_000_000_000

function vocabulary(index: number): VocabularyUnit {
  return {
    id: `unit-${index}`,
    type: 'vocab',
    term: `word-${index}`,
    normalizedTerm: `word-${index}`,
    senseId: 'primary',
    definitionZh: `释义 ${index}`,
    curriculumTags: ['cet4'],
    enrichmentStatus: 'complete',
    source: { kind: 'builtin', name: 'test', license: 'CC0-1.0' },
  }
}

function exercise(index: number): Exercise {
  return {
    id: `exercise-${index}`,
    unitId: `unit-${index}`,
    kind: 'vocab-meaning-choice',
    prompt: `word-${index}`,
    options: [
      { id: 'correct', text: `释义 ${index}` },
      { id: 'wrong', text: '其他释义' },
    ],
    answer: { kind: 'choice', correctOptionId: 'correct' },
    explanation: `word-${index} 的测试释义。`,
    difficulty: 1,
  }
}

const pack: ContentPack = {
  id: 'session-pack',
  schemaVersion: 1,
  name: '会话测试词包',
  stage: 'university',
  curriculumTags: ['cet4'],
  units: Array.from({ length: 5 }, (_, index) => vocabulary(index + 1)),
  exercises: Array.from({ length: 5 }, (_, index) => exercise(index + 1)),
  source: { kind: 'builtin', name: 'test', license: 'CC0-1.0' },
}

function valueOf<T>(result: { ok: true; value: T } | { ok: false; error: { message: string } }): T {
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

function finishTeaching(sessionId = 'session-flow'): SessionState {
  let session = valueOf(
    createSession({
      id: sessionId,
      seed: 20260718,
      pack,
      states: new Map(),
      now: NOW,
      newUnitQuota: 4,
    }),
  )
  while (session.phase === 'teaching') {
    session = valueOf(
      completeNextTeaching({
        session,
        now: NOW + session.teachingIndex * 1_000,
        logId: `${session.id}:teaching:${session.teachingIndex + 1}`,
      }),
    )
  }
  return session
}

function winCurrentBattle(session: SessionState): SessionState {
  let next = session
  for (let turn = 0; turn < 10; turn += 1) {
    const battle = next.currentBattle!
    const attackId = battle.hand.find((cardId) =>
      selectCardTemplate(battle, cardId)?.tags.includes('attack'),
    )
    if (attackId) {
      const primed: SessionState = {
        ...next,
        currentBattle: {
          ...battle,
          enemy: { ...battle.enemy, hp: 1, block: 0 },
        },
      }
      return valueOf(
        reduceSession(primed, {
          type: 'battle-action',
          action: { type: 'play-card', cardId: attackId },
        }),
      )
    }
    next = valueOf(
      reduceSession(next, {
        type: 'battle-action',
        action: { type: 'end-turn' },
      }),
    )
  }
  throw new Error('could not draw an attack card')
}

describe('learning session', () => {
  it('takes a stable four-unit snapshot, teaches each new unit, then starts battle one', () => {
    let session = valueOf(
      createSession({
        id: 'session-1',
        seed: 20260718,
        pack,
        states: new Map(),
        now: NOW,
        newUnitQuota: 4,
      }),
    )

    expect(session.phase).toBe('teaching')
    expect(session.learningSet.newUnitIds).toEqual([
      'unit-1',
      'unit-2',
      'unit-3',
      'unit-4',
    ])
    expect(session.cards).toHaveLength(12)
    expect(session.cards.slice(0, 4).map((card) => card.learningUnitId)).toEqual(
      session.learningSet.newUnitIds,
    )
    expect(session.cards.slice(4).every((card) => !card.learningUnitId)).toBe(true)

    for (let index = 0; index < 4; index += 1) {
      session = valueOf(
        completeNextTeaching({
          session,
          now: NOW + index * 1_000,
          logId: `teaching-${index + 1}`,
        }),
      )
    }

    expect(session.phase).toBe('battle-1')
    expect(session.teachingIndex).toBe(4)
    expect(session.logs).toHaveLength(4)
    expect(
      session.learningSet.newUnitIds.map(
        (unitId) => session.srsStates[unitId]?.mastery,
      ),
    ).toEqual([1, 1, 1, 1])
    expect(session.currentBattle?.enemy.definitionId).toBe('ink-blob')
  })

  it('round-trips its setup snapshot without changing IDs or card bindings', () => {
    const created = valueOf(
      createSession({
        id: 'session-resume',
        seed: 99,
        pack,
        states: new Map(),
        now: NOW,
        newUnitQuota: 4,
      }),
    )

    const restored = JSON.parse(JSON.stringify(created)) as SessionState

    expect(restored.id).toBe(created.id)
    expect(restored.learningSet).toEqual(created.learningSet)
    expect(restored.cards).toEqual(created.cards)
  })

  it('runs all three encounters and rewards to settlement without a UI', () => {
    let session = finishTeaching()

    session = winCurrentBattle(session)
    expect(session.phase).toBe('relic-reward')
    session = valueOf(
      reduceSession(session, { type: 'choose-relic', relicId: 'root-compass' }),
    )
    expect(session.phase).toBe('battle-2')
    expect(session.relicIds).toEqual(['root-compass'])

    session = winCurrentBattle(session)
    expect(session.phase).toBe('heal-reward')
    session = valueOf(reduceSession(session, { type: 'claim-heal' }))
    expect(session.phase).toBe('boss')

    session = winCurrentBattle(session)
    expect(session.phase).toBe('settlement')
    expect(buildSessionSettlement(session)).toMatchObject({
      outcome: 'completed',
      dueUnitCount: 0,
      dueAttemptedCount: 0,
      teachingCount: 4,
      nextDueAt: NOW + 24 * 60 * 60 * 1_000,
    })
  })

  it('does not advance learning progress when a bound card is played directly', () => {
    const session = finishTeaching('session-direct')
    const battle = session.currentBattle!
    const beforeStates = structuredClone(session.srsStates)
    const beforeLogs = structuredClone(session.logs)

    const next = valueOf(
      reduceSession(session, {
        type: 'battle-action',
        action: { type: 'play-card', cardId: battle.hand[0]! },
      }),
    )

    expect(next.srsStates).toEqual(beforeStates)
    expect(next.logs).toEqual(beforeLogs)
  })

  it('commits an overcharge battle result and SRS update atomically to the session', () => {
    let session = finishTeaching('session-overcharge')
    let boundCardId: string | undefined
    for (let turn = 0; turn < 5 && !boundCardId; turn += 1) {
      boundCardId = session.currentBattle?.hand.find((cardId) =>
        session.cards.some(
          (card) => card.id === cardId && card.learningUnitId !== undefined,
        ),
      )
      if (!boundCardId) {
        session = valueOf(
          reduceSession(session, {
            type: 'battle-action',
            action: { type: 'end-turn' },
          }),
        )
      }
    }
    if (!boundCardId || !session.currentBattle) {
      throw new Error('could not draw a learning-bound card')
    }
    const pending = valueOf(
      prepareOvercharge({
        battle: session.currentBattle,
        cardId: boundCardId,
        pack: session.contentPack,
        states: new Map(Object.entries(session.srsStates)),
        recentExerciseIds: session.recentExerciseIds,
        listeningAvailable: true,
        startedAt: NOW + 2 * 24 * 60 * 60 * 1_000,
      }),
    )
    const beforeLogCount = session.logs.length

    const next = valueOf(
      reduceSession(session, {
        type: 'resolve-overcharge',
        pending,
        response: 'correct',
        usedHint: false,
        responseMs: 900,
        now: NOW + 2 * 24 * 60 * 60 * 1_000,
        logId: 'session-overcharge:recall:1',
      }),
    )

    expect(next.logs).toHaveLength(beforeLogCount + 1)
    expect(next.logs.at(-1)).toMatchObject({
      unitId: pending.unitId,
      correct: true,
      graded: true,
      grade: 'good',
    })
    expect(next.srsStates[pending.unitId]?.mastery).toBe(2)
    expect(next.currentBattle?.player.focus).toBe(2)
  })

  it('keeps completed learning logs after a battle defeat', () => {
    const session = finishTeaching('session-defeat')
    const battle = session.currentBattle!
    const doomed: SessionState = {
      ...session,
      currentBattle: {
        ...battle,
        player: { ...battle.player, hp: 1, block: 0 },
      },
    }

    const defeated = valueOf(
      reduceSession(doomed, {
        type: 'battle-action',
        action: { type: 'end-turn' },
      }),
    )

    expect(defeated.phase).toBe('defeat')
    expect(defeated.logs).toHaveLength(4)
    expect(defeated.logs.every((log) => log.kind === 'teaching')).toBe(true)
  })
})
