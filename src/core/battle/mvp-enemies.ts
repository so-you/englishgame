import type { EnemyDefinition, Intent } from './model'

export const MVP_ENEMIES = [
  {
    id: 'ink-blob',
    name: '墨团',
    kind: 'normal',
    maxHp: 28,
    intentCycle: [
      {
        id: 'ink-blob-strike',
        name: '墨击',
        effects: [{ type: 'damage', amount: 6, hits: 1 }],
      },
      {
        id: 'ink-blob-guarded-strike',
        name: '覆墨',
        effects: [
          { type: 'block', amount: 5 },
          { type: 'damage', amount: 4, hits: 1 },
        ],
      },
    ],
  },
  {
    id: 'echo-bat',
    name: '回声蝠',
    kind: 'normal',
    maxHp: 32,
    intentCycle: [
      {
        id: 'echo-bat-flurry',
        name: '回声连击',
        effects: [{ type: 'damage', amount: 3, hits: 2 }],
      },
      {
        id: 'echo-bat-bite',
        name: '俯冲',
        effects: [{ type: 'damage', amount: 8, hits: 1 }],
      },
    ],
  },
  {
    id: 'oblivion-guardian',
    name: '遗忘守卫',
    kind: 'boss',
    maxHp: 85,
    intentCycle: [
      {
        id: 'oblivion-guardian-strike',
        name: '遗忘重击',
        effects: [{ type: 'damage', amount: 10, hits: 1 }],
      },
      {
        id: 'oblivion-guardian-fog',
        name: '遗忘之雾',
        effects: [
          { type: 'block', amount: 12 },
          { type: 'weak', turns: 1 },
        ],
      },
      {
        id: 'oblivion-guardian-combo',
        name: '记忆粉碎',
        effects: [{ type: 'damage', amount: 6, hits: 2 }],
      },
    ],
  },
] as const satisfies readonly EnemyDefinition[]

export function getEnemyIntent(
  enemy: EnemyDefinition,
  turnIndex: number,
): Intent {
  if (enemy.intentCycle.length === 0) {
    throw new Error(`Enemy ${enemy.id} has no intent cycle`)
  }

  const normalizedIndex =
    ((Math.trunc(turnIndex) % enemy.intentCycle.length) + enemy.intentCycle.length) %
    enemy.intentCycle.length
  return enemy.intentCycle[normalizedIndex]!
}
