export interface SeededRngState {
  readonly value: number
}

export interface RandomStep {
  readonly value: number
  readonly state: SeededRngState
}

export interface ShuffleResult<T> {
  readonly items: readonly T[]
  readonly state: SeededRngState
}

export function createSeededRng(seed: number): SeededRngState {
  return { value: seed >>> 0 }
}

export function nextRandom(state: SeededRngState): RandomStep {
  const nextState = (state.value + 0x6d2b79f5) >>> 0
  let mixed = nextState
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)

  return {
    value: ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296,
    state: { value: nextState },
  }
}

export function shuffleWithState<T>(
  items: readonly T[],
  initialState: SeededRngState,
): ShuffleResult<T> {
  const shuffled = [...items]
  let state = initialState

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const step = nextRandom(state)
    const target = Math.floor(step.value * (index + 1))
    state = step.state
    ;[shuffled[index], shuffled[target]] = [shuffled[target]!, shuffled[index]!]
  }

  return { items: shuffled, state }
}
