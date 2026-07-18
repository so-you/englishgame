import type { BattleState, CombatEffect } from '../../core/battle/model'
import { selectCurrentIntent } from '../../core/battle/battle-selectors'
import { MVP_ENEMIES } from '../../core/battle/mvp-enemies'

function effectText(effect: CombatEffect): string {
  if (effect.type === 'damage') {
    return effect.hits > 1
      ? `造成 ${effect.amount}×${effect.hits} 点伤害`
      : `造成 ${effect.amount} 点伤害`
  }
  if (effect.type === 'block') return `获得 ${effect.amount} 点格挡`
  if (effect.type === 'weak') return `施加 ${effect.turns} 回合虚弱`
  return `抽 ${effect.amount} 张牌`
}

export function EnemyIntent({ battle }: { readonly battle: BattleState }) {
  const enemy = MVP_ENEMIES.find(
    (candidate) => candidate.id === battle.enemy.definitionId,
  )
  const intent = selectCurrentIntent(battle)

  return (
    <section className="enemy-panel" aria-labelledby="enemy-name">
      <p className="eyebrow">第 {battle.turn} 回合</p>
      <h1 id="enemy-name">{enemy?.name ?? '未知敌人'}</h1>
      <p className="enemy-health">
        生命 {battle.enemy.hp} / {battle.enemy.maxHp}
        {battle.enemy.block > 0 ? ` · 格挡 ${battle.enemy.block}` : ''}
      </p>
      <div className="intent-card">
        <span>下一意图</span>
        <strong>{intent?.name ?? '无法判断'}</strong>
        <p>{intent?.effects.map(effectText).join('，')}</p>
      </div>
    </section>
  )
}
