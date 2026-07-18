import { MVP_BALANCE } from '../../core/config/mvp-balance'

interface HealRewardScreenProps {
  readonly hp: number
  readonly maxHp: number
  readonly onClaim: () => void
}

export function HealRewardScreen({ hp, maxHp, onClaim }: HealRewardScreenProps) {
  const healedHp = Math.min(maxHp, hp + MVP_BALANCE.healReward)
  const recovered = healedHp - hp

  return (
    <main className="screen reward-screen centered-panel">
      <section className="heal-card" aria-labelledby="heal-title">
        <p className="eyebrow">第二场战斗完成</p>
        <h1 id="heal-title">整备恢复</h1>
        <p className="heal-value">{hp} → {healedHp} 生命</p>
        <p>
          {recovered > 0
            ? `恢复 ${recovered} 点生命，然后挑战遗忘守卫。`
            : '生命已满，准备挑战遗忘守卫。'}
        </p>
        <button
          type="button"
          className="button button--primary button--large"
          onClick={onClaim}
        >
          领取恢复并挑战首领
        </button>
      </section>
    </main>
  )
}
