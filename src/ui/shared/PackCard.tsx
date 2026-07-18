import type { ContentPack } from '../../core/learning/model'

interface PackCardProps {
  readonly pack: ContentPack
  readonly selected: boolean
  readonly dueCount: number
  readonly onSelect: () => void
}

export function PackCard({
  pack,
  selected,
  dueCount,
  onSelect,
}: PackCardProps) {
  const playableCount = pack.units.filter(
    (unit) => unit.type === 'grammar' || unit.enrichmentStatus === 'complete',
  ).length

  return (
    <label className={`pack-card${selected ? ' pack-card--selected' : ''}`}>
      <input
        type="radio"
        name="content-pack"
        checked={selected}
        onChange={onSelect}
      />
      <span className="pack-card__body">
        <span className="pack-card__name">{pack.name}</span>
        <span className="pack-card__meta">
          {playableCount} 个学习项目 · {dueCount} 个到期项目
        </span>
        <span className="pack-card__source">
          {pack.stage === 'custom' ? '自定义词表' : '内置大学词汇'}
        </span>
      </span>
    </label>
  )
}
