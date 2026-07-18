type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5

export interface MvpBalance {
  readonly playerStartingHp: number
  readonly energyPerTurn: number
  readonly cardsDrawnPerTurn: number
  readonly handLimit: number
  readonly deckSize: number
  readonly focusPerBattle: number
  readonly fluencyThreshold: number
  readonly braveryBlock: number
  readonly healReward: number
  readonly dueChallengeBonus: number
  readonly hintedBonusMultiplier: number
  readonly dueUnitLimit: number
  readonly newUnitQuotaDefault: number
  readonly newUnitQuotaMax: number
  readonly importMaxBytes: number
  readonly importMaxRows: number
  readonly intervalDaysByMastery: Partial<Record<MasteryLevel, number>>
  readonly overchargeBonusByMastery: Partial<Record<MasteryLevel, number>>
}

export interface BalanceViolation {
  readonly field: string
  readonly message: string
}

export const MVP_BALANCE: MvpBalance = Object.freeze({
  playerStartingHp: 50,
  energyPerTurn: 3,
  cardsDrawnPerTurn: 5,
  handLimit: 10,
  deckSize: 12,
  focusPerBattle: 3,
  fluencyThreshold: 3,
  braveryBlock: 2,
  healReward: 12,
  dueChallengeBonus: 1,
  hintedBonusMultiplier: 0.5,
  dueUnitLimit: 8,
  newUnitQuotaDefault: 4,
  newUnitQuotaMax: 4,
  importMaxBytes: 5 * 1024 * 1024,
  importMaxRows: 5_000,
  intervalDaysByMastery: Object.freeze({
    0: 0,
    1: 1,
    2: 3,
    3: 7,
    4: 15,
    5: 30,
  }),
  overchargeBonusByMastery: Object.freeze({
    0: 0,
    1: 2,
    2: 3,
    3: 4,
    4: 5,
    5: 5,
  }),
})

const POSITIVE_INTEGER_FIELDS = [
  'playerStartingHp',
  'energyPerTurn',
  'cardsDrawnPerTurn',
  'handLimit',
  'deckSize',
  'focusPerBattle',
  'fluencyThreshold',
  'healReward',
  'dueUnitLimit',
  'newUnitQuotaMax',
  'importMaxBytes',
  'importMaxRows',
] as const

const NON_NEGATIVE_INTEGER_FIELDS = [
  'braveryBlock',
  'dueChallengeBonus',
  'newUnitQuotaDefault',
] as const

const MASTERY_LEVELS: readonly MasteryLevel[] = [0, 1, 2, 3, 4, 5]

export function validateMvpBalance(balance: MvpBalance): BalanceViolation[] {
  const violations: BalanceViolation[] = []

  for (const field of POSITIVE_INTEGER_FIELDS) {
    if (!Number.isInteger(balance[field]) || balance[field] <= 0) {
      violations.push({ field, message: 'must be a positive integer' })
    }
  }

  for (const field of NON_NEGATIVE_INTEGER_FIELDS) {
    if (!Number.isInteger(balance[field]) || balance[field] < 0) {
      violations.push({ field, message: 'must be a non-negative integer' })
    }
  }

  if (balance.newUnitQuotaDefault > balance.newUnitQuotaMax) {
    violations.push({
      field: 'newUnitQuotaDefault',
      message: 'must not exceed newUnitQuotaMax',
    })
  }

  if (balance.dueUnitLimit + balance.newUnitQuotaMax > balance.deckSize) {
    violations.push({
      field: 'deckSize',
      message: 'must fit dueUnitLimit plus newUnitQuotaMax',
    })
  }

  if (
    !Number.isFinite(balance.hintedBonusMultiplier) ||
    balance.hintedBonusMultiplier <= 0 ||
    balance.hintedBonusMultiplier >= 1
  ) {
    violations.push({
      field: 'hintedBonusMultiplier',
      message: 'must be greater than 0 and less than 1',
    })
  }

  let previous = -1
  for (const level of MASTERY_LEVELS) {
    const value = balance.intervalDaysByMastery[level]
    const field = `intervalDaysByMastery.${level}`

    if (!Number.isFinite(value) || (value ?? -1) < 0) {
      violations.push({ field, message: 'must be a finite non-negative number' })
      continue
    }

    if (level > 0 && value! <= previous) {
      violations.push({ field, message: 'must increase with mastery' })
    }
    previous = value!
  }

  for (const level of MASTERY_LEVELS) {
    const value = balance.overchargeBonusByMastery[level]
    if (!Number.isFinite(value) || (value ?? -1) < 0) {
      violations.push({
        field: `overchargeBonusByMastery.${level}`,
        message: 'must be a finite non-negative number',
      })
    }
  }

  return violations
}
