import { describe, expect, it } from 'vitest'

import {
  MVP_CARD_TEMPLATES,
  MVP_STARTER_DECK_TEMPLATE_IDS,
} from './mvp-cards'
import { getEnemyIntent, MVP_ENEMIES } from './mvp-enemies'
import { MVP_RELICS } from './mvp-relics'
import { canOverloadCard, type CombatCardInstance } from './model'

describe('MVP battle fixtures', () => {
  it('defines a valid twelve-card deck with five attack, five defense, and two utility shells', () => {
    const templatesById = new Map(
      MVP_CARD_TEMPLATES.map((template) => [template.id, template]),
    )
    const deck = MVP_STARTER_DECK_TEMPLATE_IDS.map((id) => templatesById.get(id))

    expect(deck).toHaveLength(12)
    expect(deck.every(Boolean)).toBe(true)
    expect(deck.filter((card) => card?.tags.includes('attack'))).toHaveLength(5)
    expect(deck.filter((card) => card?.tags.includes('defense'))).toHaveLength(5)
    expect(deck.filter((card) => card?.tags.includes('utility'))).toHaveLength(2)
    expect(templatesById.get('strike')?.effects).toEqual([
      { type: 'damage', amount: 6, hits: 1 },
    ])
  })

  it('allows overload only when a card is bound to learning content', () => {
    const neutral: CombatCardInstance = {
      id: 'card-1',
      templateId: 'strike',
      sessionId: 'session-1',
      upgraded: false,
    }

    expect(canOverloadCard(neutral)).toBe(false)
    expect(canOverloadCard({ ...neutral, learningUnitId: 'unit-1' })).toBe(true)
  })

  it('cycles each enemy intent deterministically', () => {
    const inkBlob = MVP_ENEMIES.find((enemy) => enemy.id === 'ink-blob')!
    const guardian = MVP_ENEMIES.find(
      (enemy) => enemy.id === 'oblivion-guardian',
    )!

    expect([0, 1, 2, 3].map((turn) => getEnemyIntent(inkBlob, turn).id)).toEqual([
      'ink-blob-strike',
      'ink-blob-guarded-strike',
      'ink-blob-strike',
      'ink-blob-guarded-strike',
    ])
    expect(guardian.maxHp).toBe(85)
    expect(getEnemyIntent(guardian, 1).effects).toEqual([
      { type: 'block', amount: 12 },
      { type: 'weak', turns: 1 },
    ])
  })

  it('defines the three relics without learning-state mutations', () => {
    expect(MVP_RELICS.map((relic) => relic.id)).toEqual([
      'root-compass',
      'mistake-notebook',
      'fluency-charm',
    ])
    expect(MVP_RELICS.map((relic) => relic.effect.type)).toEqual([
      'draw-cards',
      'bravery-block-bonus',
      'starting-fluency',
    ])
  })
})
