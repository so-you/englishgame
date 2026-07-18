import { describe, expect, it } from 'vitest'

import { MVP_BALANCE, validateMvpBalance } from './mvp-balance'

describe('validateMvpBalance', () => {
  it('accepts the documented MVP defaults', () => {
    expect(validateMvpBalance(MVP_BALANCE)).toEqual([])
  })

  it('reports an invalid focus budget by its public field name', () => {
    const invalid = { ...MVP_BALANCE, focusPerBattle: -1 }

    expect(validateMvpBalance(invalid)).toContainEqual({
      field: 'focusPerBattle',
      message: 'must be a positive integer',
    })
  })

  it('requires a complete increasing interval table from L0 to L5', () => {
    const invalid = {
      ...MVP_BALANCE,
      intervalDaysByMastery: { 0: 0, 1: 1, 2: 3, 3: 7, 5: 30 },
    }

    expect(validateMvpBalance(invalid)).toContainEqual({
      field: 'intervalDaysByMastery.4',
      message: 'must be a finite non-negative number',
    })
  })
})
