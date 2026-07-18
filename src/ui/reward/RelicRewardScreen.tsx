import { MVP_RELICS } from '../../core/battle/mvp-relics'

interface RelicRewardScreenProps {
  readonly ownedRelicIds: readonly string[]
  readonly onChoose: (relicId: string) => void
}

export function RelicRewardScreen({
  ownedRelicIds,
  onChoose,
}: RelicRewardScreenProps) {
  const choices = MVP_RELICS.filter(
    (relic) => !ownedRelicIds.includes(relic.id),
  )

  return (
    <main className="screen reward-screen">
      <header className="reward-header">
        <p className="eyebrow">第一场战斗完成</p>
        <h1>选择一件学习遗物</h1>
        <p>遗物只改变本次探索的战斗节奏，不改变复习成绩。</p>
      </header>
      <div className="reward-grid" aria-label="可选遗物">
        {choices.map((relic) => (
          <button
            key={relic.id}
            type="button"
            className="relic-card"
            onClick={() => onChoose(relic.id)}
          >
            <span aria-hidden="true">◇</span>
            <strong>{relic.name}</strong>
            <p>{relic.description}</p>
            <small>选择后进入下一场战斗</small>
          </button>
        ))}
      </div>
    </main>
  )
}
