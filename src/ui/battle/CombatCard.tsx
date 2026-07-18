import type {
  CardTemplate,
  CombatCardInstance,
} from '../../core/battle/model'
import type { LearningUnit } from '../../core/learning/model'

function effectText(template: CardTemplate): string {
  return template.effects
    .map((effect) => {
      if (effect.type === 'damage') {
        return effect.hits > 1
          ? `${effect.amount}×${effect.hits} 伤害`
          : `${effect.amount} 伤害`
      }
      if (effect.type === 'block') return `${effect.amount} 格挡`
      if (effect.type === 'draw') return `抽 ${effect.amount} 张牌`
      return `${effect.turns} 回合虚弱`
    })
    .join(' · ')
}

interface CombatCardProps {
  readonly card: CombatCardInstance
  readonly template: CardTemplate
  readonly unit?: LearningUnit
  readonly selected: boolean
  readonly playable: boolean
  readonly onSelect: () => void
}

export function CombatCard({
  card,
  template,
  unit,
  selected,
  playable,
  onSelect,
}: CombatCardProps) {
  const inscription =
    unit?.type === 'vocab'
      ? unit.term
      : unit?.type === 'grammar'
        ? unit.name
        : '中性卡'

  return (
    <button
      type="button"
      className={`combat-card${selected ? ' combat-card--selected' : ''}`}
      data-testid={`combat-card-${card.id}`}
      aria-pressed={selected}
      disabled={!playable}
      onClick={onSelect}
    >
      <span className="combat-card__cost" aria-label={`费用 ${template.cost}`}>
        {template.cost}
      </span>
      <strong>{template.name}</strong>
      <span className="combat-card__effect">{effectText(template)}</span>
      <span className={`combat-card__inscription${unit ? '' : ' combat-card__inscription--neutral'}`}>
        {inscription}
      </span>
    </button>
  )
}
