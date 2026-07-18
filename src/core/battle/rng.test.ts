import { describe, expect, it } from 'vitest'

import {
  createSeededRng,
  nextRandom,
  shuffleWithState,
} from './rng'

describe('seeded battle random', () => {
  it('replays the same shuffle from the same seed', () => {
    const cards = ['a', 'b', 'c', 'd', 'e', 'f']

    const first = shuffleWithState(cards, createSeededRng(20260718))
    const second = shuffleWithState(cards, createSeededRng(20260718))

    expect(first).toEqual(second)
    expect(first.items).not.toEqual(cards)
    expect(cards).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })

  it('continues exactly after its state is serialized and restored', () => {
    const initial = createSeededRng(42)
    const first = nextRandom(initial)
    const restored = JSON.parse(JSON.stringify(first.state)) as typeof first.state

    expect(nextRandom(restored)).toEqual(nextRandom(first.state))
    expect(first.value).toBeGreaterThanOrEqual(0)
    expect(first.value).toBeLessThan(1)
  })
})
