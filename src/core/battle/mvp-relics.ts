import type { RelicDefinition } from './model'

export const MVP_RELICS = [
  {
    id: 'root-compass',
    name: '词根罗盘',
    description: '每场第一次过载正确后抽 1 张牌。',
    trigger: 'first-overload-correct',
    effect: { type: 'draw-cards', amount: 1 },
  },
  {
    id: 'mistake-notebook',
    name: '错题本',
    description: '每场第一次尝试到期项目时，勇气奖励额外获得 2 点格挡。',
    trigger: 'first-due-attempt',
    effect: { type: 'bravery-block-bonus', amount: 2 },
  },
  {
    id: 'fluency-charm',
    name: '语流护符',
    description: '每场战斗以 1 点语流开始。',
    trigger: 'battle-start',
    effect: { type: 'starting-fluency', amount: 1 },
  },
] as const satisfies readonly RelicDefinition[]
