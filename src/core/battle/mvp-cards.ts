import type { CardTemplate } from './model'

export const MVP_CARD_TEMPLATES: readonly CardTemplate[] = [
  {
    id: 'strike',
    name: '打击',
    cost: 1,
    rarity: 'starter',
    effects: [{ type: 'damage', amount: 6, hits: 1 }],
    tags: ['attack'],
  },
  {
    id: 'defend',
    name: '防御',
    cost: 1,
    rarity: 'starter',
    effects: [{ type: 'block', amount: 5 }],
    tags: ['defense'],
  },
  {
    id: 'heavy-strike',
    name: '重击',
    cost: 2,
    rarity: 'starter',
    effects: [{ type: 'damage', amount: 12, hits: 1 }],
    tags: ['attack'],
  },
  {
    id: 'fortify',
    name: '固守',
    cost: 2,
    rarity: 'starter',
    effects: [{ type: 'block', amount: 11 }],
    tags: ['defense'],
  },
  {
    id: 'insight',
    name: '洞察',
    cost: 1,
    rarity: 'starter',
    effects: [{ type: 'draw', amount: 2 }],
    tags: ['utility'],
  },
  {
    id: 'disrupt',
    name: '干扰',
    cost: 1,
    rarity: 'starter',
    effects: [{ type: 'weak', turns: 1 }],
    tags: ['utility'],
  },
]

export const MVP_STARTER_DECK_TEMPLATE_IDS = [
  'strike',
  'strike',
  'strike',
  'strike',
  'defend',
  'defend',
  'defend',
  'defend',
  'heavy-strike',
  'fortify',
  'insight',
  'disrupt',
] as const
