import { describe, expect, it } from 'vitest'

import {
  selectCanPlayCard,
  selectCardTemplate,
  selectCurrentIntent,
} from '../battle/battle-selectors'
import { MVP_RELICS } from '../battle/mvp-relics'
import type { CombatEffect } from '../battle/model'
import { CET4_MVP_PACK } from '../../data/packs'
import { completeNextTeaching } from './complete-teaching'
import { createSession } from './create-session'
import type { SessionState } from './model'
import { prepareOvercharge } from './prepare-overcharge'
import { reduceSession, type SessionAction } from './session-reducer'

const NOW = 1_800_000_000_000

function valueOf<T>(result: { ok: true; value: T } | { ok: false; error: { message: string } }): T {
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

function damageOf(effects: readonly CombatEffect[]): number {
  return effects.reduce(
    (total, effect) =>
      total + (effect.type === 'damage' ? effect.amount * effect.hits : 0),
    0,
  )
}

function responseFor(session: SessionState, cardId: string, actionId: number) {
  const pending = valueOf(
    prepareOvercharge({
      battle: session.currentBattle!,
      cardId,
      pack: session.contentPack,
      states: new Map(Object.entries(session.srsStates)),
      recentExerciseIds: session.recentExerciseIds,
      listeningAvailable: false,
      startedAt: NOW + actionId,
    }),
  )
  const answer = pending.exercise.answer
  const response =
    answer.kind === 'choice'
      ? answer.correctOptionId
      : answer.kind === 'text'
        ? answer.accepted[0]!
        : answer.acceptedOrders[0]!
  return { pending, response }
}

function choosePlayableCard(session: SessionState): string | undefined {
  const battle = session.currentBattle!
  const playable = battle.hand.filter((cardId) =>
    selectCanPlayCard(battle, cardId),
  )
  const incomingDamage = damageOf(selectCurrentIntent(battle)?.effects ?? [])
  if (incomingDamage > battle.player.block) {
    const defense = playable.find((cardId) =>
      selectCardTemplate(battle, cardId)?.effects.some(
        (effect) => effect.type === 'block',
      ),
    )
    if (defense) return defense
  }
  return (
    playable.find((cardId) =>
      selectCardTemplate(battle, cardId)?.effects.some(
        (effect) => effect.type === 'damage',
      ),
    ) ?? playable[0]
  )
}

function simulate(seed: number): { won: boolean; actions: number } {
  let session = valueOf(
    createSession({
      id: `simulation-${seed}`,
      seed,
      pack: CET4_MVP_PACK,
      states: new Map(),
      now: NOW,
      newUnitQuota: 4,
    }),
  )
  let actions = 0
  while (session.phase === 'teaching') {
    session = valueOf(
      completeNextTeaching({
        session,
        now: NOW,
        logId: `simulation-${seed}:teaching:${actions++}`,
      }),
    )
  }

  while (session.phase !== 'settlement' && session.phase !== 'defeat') {
    if (session.phase === 'relic-reward') {
      const relic = MVP_RELICS.find(
        (candidate) => !session.relicIds.includes(candidate.id),
      )!
      session = valueOf(
        reduceSession(session, { type: 'choose-relic', relicId: relic.id }),
      )
      continue
    }
    if (session.phase === 'heal-reward') {
      session = valueOf(reduceSession(session, { type: 'claim-heal' }))
      continue
    }

    const cardId = choosePlayableCard(session)
    let action: SessionAction
    const card = cardId
      ? session.cards.find((candidate) => candidate.id === cardId)
      : undefined
    if (
      cardId &&
      card?.learningUnitId &&
      session.currentBattle!.player.focus > 0
    ) {
      const prepared = responseFor(session, cardId, actions)
      action = {
        type: 'resolve-overcharge',
        ...prepared,
        usedHint: false,
        confirmedNearMatch: false,
        now: NOW + actions,
        logId: `simulation-${seed}:recall:${actions}`,
      }
    } else if (cardId) {
      action = { type: 'battle-action', action: { type: 'play-card', cardId } }
    } else {
      action = { type: 'battle-action', action: { type: 'end-turn' } }
    }
    session = valueOf(reduceSession(session, action))
    actions += 1
    if (actions > 500) throw new Error(`Seed ${seed} did not terminate.`)
  }

  return { won: session.phase === 'settlement', actions }
}

describe('fixed-seed MVP balance simulation', () => {
  it('lets a defensive correct-recall strategy finish most three-battle runs', () => {
    const results = Array.from({ length: 64 }, (_, seed) => simulate(seed + 1))
    const wins = results.filter((result) => result.won).length

    expect(wins).toBeGreaterThanOrEqual(52)
    expect(Math.max(...results.map((result) => result.actions))).toBeLessThan(500)
  })
})
